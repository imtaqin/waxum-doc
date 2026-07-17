---
sidebar_position: 9
---

# Calls

REST surface for WhatsApp voice calls. Two families of endpoints:

- **Signalling** — [`ring`](#ring), [`reject`](#reject),
  [`accept`](#accept), [`terminate`](#terminate). Attention-grab pings
  and missed-call OTP flows. Also used to answer or drop incoming
  calls surfaced by the `incoming_call` webhook.
- **Media** — [`tts`](#tts) and [`play`](#play). Place an outgoing
  call and stream real audio into it (synthesised speech or an
  arbitrary audio file / URL). The peer picks up the call and hears
  your audio, then waxum hangs up automatically once playback ends.

Media is fed through the upstream `whatsapp-rust` VoIP engine as
16 kHz mono PCM, encoded to Opus on the fly. 1:1 video call
signalling is supported (see `kind: "video"` on [`ring`](#ring));
video media (frame ingest) is not yet exposed at the REST layer —
drive `voip::CallHandle::start_video` from Rust directly if you need
it.

:::note Server requirements
- **`/calls/play`** — requires `ffmpeg` on `$PATH` (used to decode
  arbitrary sources to PCM 16 kHz mono).
- **`/calls/tts`** — requires the [`edge-tts`](https://pypi.org/project/edge-tts)
  Python CLI on `$PATH` for Microsoft Edge neural-voice synthesis.
- Both endpoints work fully offline once the audio bytes are in
  memory; only the initial fetch/synth step touches the network.
:::

## Ring

Ring a peer.

```
POST /api/v1/sessions/{session_id}/calls/ring
```

### Request Body

```json
{
  "to": "6285117822731",
  "kind": "audio",
  "call_id": "OPTIONAL-CUSTOM-CALL-ID"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient phone number or full JID |
| `kind` | string | No | `"audio"` (default) or `"video"` |
| `call_id` | string | No | Custom call id. Omit to auto-generate |

`kind: "video"` adds a `<video enc="vp8">` codec child to the offer so
the peer's phone shows the video-call incoming UI instead of the plain
audio-call one. `ring` itself does not carry media — the peer hears a
ringtone, then the call drops with "not connected" after the ring
timeout. For calls with real audio, use [`/tts`](#tts) or
[`/play`](#play) instead.

### Response

```json
{
  "call_id": "00b92fd4ad13123648f76533b4939625",
  "to": "6285117822731@s.whatsapp.net"
}
```

Save the returned `call_id` — you'll need it to terminate the call
before the peer's phone times out.

## Reject

Reject an incoming call. Requires the `call_id` and caller JID surfaced
by the `incoming_call` webhook event.

```
POST /api/v1/sessions/{session_id}/calls/reject
```

### Request Body

```json
{
  "from": "6285117822731@s.whatsapp.net",
  "call_id": "00A0F769CA10E8F99EE309BDEAF4E933"
}
```

### Response

```json
{
  "success": true,
  "message": "Call rejected"
}
```

## Accept

Accept an incoming call. Mark it as answered in the peer's call log.

```
POST /api/v1/sessions/{session_id}/calls/accept
```

### Request Body

```json
{
  "from": "6285117822731@s.whatsapp.net",
  "call_id": "00A0F769CA10E8F99EE309BDEAF4E933"
}
```

### Response

```json
{
  "success": true,
  "message": "Call accepted"
}
```

## Terminate

Hang up a live call (either an outgoing ring you started, or an
accepted incoming call).

```
POST /api/v1/sessions/{session_id}/calls/terminate
```

### Request Body

```json
{
  "peer": "6285117822731@s.whatsapp.net",
  "call_id": "00b92fd4ad13123648f76533b4939625",
  "reason": "hangup"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `peer` | string | Yes | Peer JID |
| `call_id` | string | Yes | The `call_id` to terminate |
| `reason` | string | No | Terminate reason attr. Defaults to `"hangup"` |

### Response

```json
{
  "success": true,
  "message": "Call terminated"
}
```

## TTS

Place an outgoing voice call and speak a synthesised message into it.
Uses [`edge-tts`](https://pypi.org/project/edge-tts) under the hood
(Microsoft Edge neural voices).

Typical use case: **voice OTP delivery** — call the user, read the
6-digit code aloud, hang up. Higher trust than SMS, lower cost than
Twilio Voice.

```
POST /api/v1/sessions/{session_id}/calls/tts
```

### Request Body

```json
{
  "to": "6285117822731",
  "text": "Your verification code is 4 8 2 9 1 5. I repeat, 4 8 2 9 1 5.",
  "voice": "id-ID-ArdiNeural",
  "answer_grace_ms": 6000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient phone number or full JID |
| `text` | string | Yes | Text to synthesise. Non-empty |
| `voice` | string | No | edge-tts voice id. Default `"id-ID-ArdiNeural"` |
| `answer_grace_ms` | integer | No | Silence prefix in ms before the speech starts, so the callee has time to pick up. Default `6000` |

Voice ids are the standard edge-tts catalogue —
`id-ID-ArdiNeural` (Bahasa Indonesia, male), `en-US-JennyNeural`,
`ja-JP-NanamiNeural`, and so on. Run `edge-tts --list-voices` to see
the full list.

### Response

```json
{
  "call_id": "9c0b12fe83aa47adbc9d1e4f6a7e0d81",
  "to": "6285117822731@s.whatsapp.net"
}
```

The call is placed and speech starts streaming in the background. The
call auto-terminates ~500 ms after the last PCM frame is sent. Use
[`/terminate`](#terminate) with the returned `call_id` to hang up
earlier.

## Play

Place an outgoing voice call and stream an arbitrary audio file (or
URL) into it. Uses `ffmpeg` under the hood to decode → 16 kHz mono
PCM, so anything ffmpeg understands works — mp3, wav, ogg, m4a,
remote HTTP(S) URLs, even local file paths on the server.

```
POST /api/v1/sessions/{session_id}/calls/play
```

### Request Body

```json
{
  "to": "6285117822731",
  "audio_url": "https://cdn.example.com/announcements/promo.mp3",
  "answer_grace_ms": 6000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient phone number or full JID |
| `audio_url` | string | Yes | Anything ffmpeg can open — HTTP(S) URL, local path on the server, or `pipe:` |
| `answer_grace_ms` | integer | No | Silence prefix in ms before playback starts. Default `6000` |

### Response

```json
{
  "call_id": "b3a1f7e0d2c6483b91a58f7c22e04d15",
  "to": "6285117822731@s.whatsapp.net"
}
```

Same lifecycle as `/tts` — playback runs in the background, the call
auto-terminates once the audio ends.

## Incoming Call Webhook

An incoming call fires the `incoming_call` webhook event. Data payload:

```json
{
  "from": "6285117822731@s.whatsapp.net",
  "stanza_id": "5C1F3A2E4B6D7F8E",
  "call_id": "00A0F769CA10E8F99EE309BDEAF4E933",
  "call_creator": "6285117822731@s.whatsapp.net",
  "notify": "Taqin",
  "platform": "android",
  "version": "2.25.37.76",
  "timestamp": 1783483722,
  "offline": false,
  "action": "Offer { ... }"
}
```

Take the `call_id` and `from` fields and forward them to
`/calls/reject`, `/calls/accept`, or `/calls/terminate` as appropriate.
