---
sidebar_position: 5
---

# Webhooks

Receive real-time events from WhatsApp via HTTP webhooks.

## Register Webhook

Register a webhook for a session.

```
POST /api/v1/sessions/{session_id}/webhooks
```

### Request Body

```json
{
  "url": "https://example.com/webhook",
  "events": ["message", "connected", "disconnected"],
  "secret": "your-webhook-secret"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `url` | string | Yes | Webhook endpoint URL |
| `events` | array | No | Events to subscribe (default: all) |
| `secret` | string | No | HMAC-SHA256 secret for signature |

### Response

```json
{
  "id": "webhook-uuid",
  "url": "https://example.com/webhook",
  "events": ["message", "connected", "disconnected"],
  "enabled": true
}
```

---

## List Webhooks

Get all webhooks for a session.

```
GET /api/v1/sessions/{session_id}/webhooks
```

### Response

```json
{
  "webhooks": [
    {
      "url": "https://example.com/webhook",
      "events": ["all"],
      "secret": null,
      "enabled": true
    }
  ],
  "count": 1
}
```

---

## Delete Webhook

Remove a webhook.

```
DELETE /api/v1/sessions/{session_id}/webhooks/{webhook_id}
```

---

## Re-enable Webhook

Webhooks are auto-disabled after 100 consecutive delivery failures (see
[Auto-disable](#circuit-breaker--auto-disable) below). Use this endpoint to flip a
disabled webhook back to `enabled=true` and clear the disable metadata
once the target endpoint is fixed.

```
POST /api/v1/sessions/{session_id}/webhooks/{webhook_id}/enable
```

### Response

```json
{
  "success": true,
  "message": "Webhook re-enabled"
}
```

---

## Circuit Breaker & Auto-disable

The dispatcher tracks per-URL delivery failures and reacts in two
stages so a single dead endpoint can't flood the log or block the
runtime.

- **OPEN (5 min cooldown)** — after 25 consecutive failures the URL
  enters an OPEN circuit. Dispatch is skipped for 5 minutes; log lines
  drop to a single `circuit OPEN` warning instead of one per attempt.
- **Auto-disable (permanent)** — after 100 consecutive failures the
  webhook row is switched to `enabled=false`, `disabled_at` gets the
  current timestamp, and `disabled_reason` records the last error
  string. In-memory registrations pointing at that URL are purged from
  every session at the same time. The dispatcher will never try the
  URL again until it is re-enabled via `POST /webhooks/{id}/enable`.

### Schema columns

The `webhooks` table carries two additional columns:

- `disabled_at` (`TIMESTAMPTZ` / `VARCHAR(30)` / `TEXT` depending on
  backend) — when the auto-disable fired, `NULL` otherwise
- `disabled_reason` (`TEXT`) — the last error surfaced before the
  auto-disable, for later triage

Both are cleared by `POST /webhooks/{id}/enable`.

---

## Retries & Dead-letter Queue

A delivery that gets a non-2xx response (or a transport error) is
retried with exponential backoff in a background task — the event
pipeline never blocks on a slow or dead target. The retry policy is
configurable via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBHOOK_RETRY_MAX_ATTEMPTS` | `3` | Total delivery attempts per event before dead-lettering. Backoff: immediate, +5 s, +30 s, then doubling (60 s, 120 s, …) capped at 5 min |
| `WEBHOOK_RETRY_ON_4XX` | `true` | Also retry 4xx responses. A 401/403 window is usually a fixable consumer-side misconfig, and dropping those events loses messages. Set to `false` to restore the old "4xx is permanent" behavior (408/429 are retried either way) |
| `WEBHOOK_DLQ_CAPACITY` | `100` | Per-session in-memory DLQ ring size; oldest entries are evicted past the cap |

Deliveries that exhaust every attempt land in a per-session
**dead-letter queue**. Each entry keeps everything needed to replay:
session id, webhook URL, event name, the verbatim payload, failure
reason, attempt count and timestamp.

> The in-memory DLQ is **lost on restart**. Failures are also recorded
> in the DB `webhook_dlq` table, which is the durable record.

### List DLQ Entries

```
GET /api/v1/sessions/{session_id}/webhooks/dlq
```

Newest first.

```json
{
  "entries": [
    {
      "id": "dlq-entry-uuid",
      "session_id": "my-session",
      "webhook_url": "https://example.com/webhook",
      "event": "message",
      "payload": "{\"session_id\":\"my-session\",\"event\":\"message\",...}",
      "last_error": "HTTP 401 Unauthorized",
      "attempts": 3,
      "failed_at": 1767143203
    }
  ],
  "count": 1
}
```

### Replay a DLQ Entry

```
POST /api/v1/sessions/{session_id}/webhooks/dlq/{entry_id}/replay
```

Re-delivers the stored payload verbatim through the same signing and
retry path as a fresh event (including the HMAC secret captured at
failure time, so the signature scheme is identical). The entry is
removed up front; if the re-delivery also exhausts its retries it lands
back in the DLQ as a new entry. Returns `400` if the URL's circuit
breaker is currently OPEN — the entry stays queued in that case.

```json
{
  "success": true,
  "message": "Webhook DLQ entry replay scheduled"
}
```

---

## Event Types

### Core Events

| Event | Description |
|-------|-------------|
| `all` | Subscribe to all events |
| `message` | New message received |
| `receipt` | Message receipt (delivered, read) |
| `presence` | Contact online/offline status |
| `chat_presence` | Typing indicator |
| `connected` | Connected to WhatsApp |
| `disconnected` | Disconnected from WhatsApp |
| `logged_out` | Logged out from WhatsApp |
| `qr_code` | QR code generated |
| `pair_code` | Pair code generated |

### Group Events

| Event | Description |
|-------|-------------|
| `group_update` | Group info changed |
| `joined_group` | Joined a new group |

### Contact & Profile Events

| Event | Description |
|-------|-------------|
| `picture_update` | Profile picture changed |
| `user_about_update` | User about/status text changed |
| `push_name_update` | Display name changed |
| `contact_update` | Contact information updated |
| `device_list_update` | Linked devices changed |

### Chat Events

| Event | Description |
|-------|-------------|
| `pin_update` | Message pinned or unpinned |
| `mute_update` | Chat muted or unmuted |
| `archive_update` | Chat archived or unarchived |
| `mark_chat_as_read` | Chat marked as read |

### System Events

| Event | Description |
|-------|-------------|
| `undecryptable_message` | Received a message that could not be decrypted |
| `client_outdated` | Client version is outdated |
| `offline_sync_preview` | Preview of offline messages available |
| `offline_sync_completed` | Offline message sync completed |
| `account_locked` | WhatsApp locked the account; auto-reconnect paused (v0.12.0+) |
| `call_log_sync` | Call-log app-state mutation received |
| `stream_error` | Stream-level error from WhatsApp (e.g. `429` rate limit) |
| `enc_decrypt_failed` | A message failed to decrypt; carries which message and why |

---

## Webhook Payload

All webhook payloads follow this format:

```json
{
  "session_id": "my-session",
  "event": "message",
  "timestamp": 1767143203,
  "data": {
    // Event-specific data
  }
}
```

Message-event envelopes carry one extra top-level field (v0.12.0+):

| Field | Description |
|-------|-------------|
| `offline` | `true` when the message was redelivered from the disconnect window (received while the session was offline, replayed on reconnect); `false` for live arrivals |

### Message Event

```json
{
  "session_id": "my-session",
  "event": "message",
  "timestamp": 1767143203,
  "offline": false,
  "data": {
    "from": "628123456789@s.whatsapp.net",
    "from_phone": "628123456789",
    "chat": "628123456789@s.whatsapp.net",
    "message_id": "3EB0ABC123...",
    "is_from_me": false,
    "push_name": "Sender",
    "message_type": "text",
    "text": "hello",
    "caption": null,
    "media_mimetype": null,
    "media": null,
    "location": null,
    "is_group": false,
    "participant": "628123456789@s.whatsapp.net"
  }
}
```

#### `from` vs `from_phone` (v0.9.7+)

`from` is the raw JID WhatsApp used to address the message, verbatim —
for [LID-only contacts](./messages.md#lid-auto-resolve) that is a
`12300954140784@lid` value, not a phone number, and no amount of
waiting for a later webhook or saving the contact changes that; the
[auto-resolve](./messages.md#lid-auto-resolve) behavior only applies
to `/messages/*` sends, not to inbound webhooks.

`from_phone` is waxum's best-effort resolution of that sender to a
plain phone number (`"628123456789"`, no JID suffix), added
specifically so consumers don't have to do this themselves:

- If `from` is already a phone-number JID, `from_phone` is that same
  number — no lookup needed.
- If `from` is a `@lid`, waxum looks it up in the LID↔phone mapping
  the WhatsApp client already learns passively (from `usync`, message
  sender attributes, history sync, etc. — no extra network call on
  waxum's side). This is usually already warm for contacts that have
  messaged you before.
- If the mapping isn't known yet, `from_phone` is `null`. This can
  happen for a LID's very first message before WhatsApp has surfaced
  the phone number through any of those passive channels.

`from_phone: null` is a real "not known yet" outcome, not a bug —
build fallback handling for it if your integration depends on the
phone number.

### Location Message (v0.6.2+)

When `message_type` is `location` or a live location is received, the
`location` field carries the GPS payload.

```json
{
  "session_id": "my-session",
  "event": "message",
  "data": {
    "from": "628123456789@s.whatsapp.net",
    "message_id": "AC...",
    "message_type": "location",
    "text": null,
    "location": {
      "latitude": -6.98,
      "longitude": 109.13,
      "name": "Hotel X",
      "address": "Jl. Sudirman No. 1",
      "url": "https://maps.google.com/?q=-6.98,109.13",
      "accuracy_meters": 12,
      "speed_mps": 0,
      "is_live": false
    }
  }
}
```

Live locations carry the same `latitude`/`longitude` plus
`sequence_number`, optional `caption`, and `is_live: true`. The body
streams as a series of `message` events with the same `message_id`.

### Connected Event

```json
{
  "session_id": "my-session",
  "event": "connected",
  "timestamp": 1767143203,
  "data": {}
}
```

### Picture Update Event

```json
{
  "session_id": "my-session",
  "event": "picture_update",
  "timestamp": 1767143203,
  "data": {
    "jid": "628123456789@s.whatsapp.net",
    "action": "set"
  }
}
```

### Pin Update Event

```json
{
  "session_id": "my-session",
  "event": "pin_update",
  "timestamp": 1767143203,
  "data": {
    "chat_jid": "628123456789@s.whatsapp.net",
    "pinned": true
  }
}
```

### Account Locked Event

Emitted when WhatsApp locks the account (v0.12.0+). Auto-reconnect is
paused with an escalating cooldown — repeated locks inside the same
process lifetime walk the schedule, and the last step repeats once the
list is exhausted. A manual
[`POST /sessions/{id}/connect`](./sessions.md#connect-session) lifts the
cooldown and reconnects immediately.

```json
{
  "session_id": "my-session",
  "event": "account_locked",
  "timestamp": 1767143203,
  "data": {
    "reason": "AccountLocked",
    "cooldown_secs": 300,
    "cooldown_until": 1767143503
  }
}
```

| Field | Description |
|-------|-------------|
| `reason` | Lock reason from WhatsApp |
| `cooldown_secs` | Cooldown applied for this lock, in seconds |
| `cooldown_until` | Unix timestamp when the cooldown ends |

The cooldown schedule is configurable via the `ACCOUNT_LOCK_BACKOFF_SECS`
environment variable — a comma-separated list of seconds, default
`300,900,3600` (5 min → 15 min → 60 min).

### Call Log Sync Event

Emitted when a call-log app-state mutation arrives.

```json
{
  "session_id": "my-session",
  "event": "call_log_sync",
  "timestamp": 1767143203,
  "data": {
    "call_creator_jid": "628123456789@s.whatsapp.net",
    "call_id": "ABCD1234...",
    "from_me": false,
    "timestamp": 1767143100,
    "from_full_sync": false,
    "record": "CallLogRecord { ... }"
  }
}
```

| Field | Description |
|-------|-------------|
| `call_creator_jid` | JID that initiated the call |
| `call_id` | WhatsApp call ID |
| `from_me` | `true` when the call was placed by this account |
| `timestamp` | Unix timestamp of the call-log record |
| `from_full_sync` | `true` when the record arrived via a full (snapshot) app-state sync |
| `record` | Debug representation of the full call-log record |

### Stream Error Event

Emitted on stream-level errors from WhatsApp — e.g. a `429` rate-limit
rejection.

```json
{
  "session_id": "my-session",
  "event": "stream_error",
  "timestamp": 1767143203,
  "data": {
    "code": "429"
  }
}
```

### Enc Decrypt Failed Event

Emitted when a specific message fails to decrypt, with which message
and why.

```json
{
  "session_id": "my-session",
  "event": "enc_decrypt_failed",
  "timestamp": 1767143203,
  "data": {
    "chat": "628123456789@s.whatsapp.net",
    "sender": "628123456789@s.whatsapp.net",
    "message_id": "3EB0ABC123...",
    "enc_index": 0,
    "enc_type": "skmsg",
    "reason": "NoSession"
  }
}
```

| Field | Description |
|-------|-------------|
| `chat` | Chat JID the failed message belongs to |
| `sender` | Sender JID |
| `message_id` | WhatsApp message ID that failed to decrypt |
| `enc_index` | Index of the failing encryption layer |
| `enc_type` | Encryption type of the failing payload (e.g. `skmsg`) |
| `reason` | Failure reason (e.g. `NoSession`) |

---

## Signature Verification

If you provide a `secret`, Waxum will sign the payload with HMAC-SHA256.

Three headers are sent together:

```
X-Webhook-Timestamp: 1767143203
X-Webhook-Signature: sha256=abc123...
X-Webhook-Signature-Version: v2
```

**Signature scheme `v2` (v0.9.8+):** the signature covers
`{timestamp}.{raw body}` (the `X-Webhook-Timestamp` value and the raw
request body joined with a literal `.`), not the raw body alone — a
captured `(url, timestamp, signature, body)` tuple has a valid signature
forever otherwise, since nothing about it changes on replay. The HMAC-SHA256
digest is hex-encoded and prefixed with `sha256=`. Reject anything where
`X-Webhook-Timestamp` is further than a few minutes from your own clock
*before* checking the signature; that's what actually stops replay, the
signature alone only proves the payload wasn't tampered with.

`X-Webhook-Signature-Version` tells you which scheme produced the
signature: `v2` is the timestamp-prefixed scheme above. Deliveries from
waxum < v0.9.8 signed the raw body alone and carried no version header —
if you support both, treat a missing header as the legacy `v1` scheme.

### Verification Example (Node.js)

```javascript
const crypto = require('crypto');

const MAX_CLOCK_SKEW_SECONDS = 300; // 5 minutes

function verifySignature(payload, timestamp, signature, secret) {
  const skew = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(skew) || skew > MAX_CLOCK_SKEW_SECONDS) {
    return false; // too old (or too far in the future) -- possible replay
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${payload}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express middleware
app.post('/webhook', (req, res) => {
  const timestamp = req.headers['x-webhook-timestamp'];
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, timestamp, signature, 'your-secret')) {
    return res.status(401).send('Invalid signature');
  }

  // Process webhook
  console.log(req.body);
  res.sendStatus(200);
});
```

### Verification Example (Python)

```python
import hmac
import hashlib
import time

MAX_CLOCK_SKEW_SECONDS = 300  # 5 minutes

def verify_signature(payload, timestamp, signature, secret):
    try:
        skew = abs(time.time() - int(timestamp))
    except (TypeError, ValueError):
        return False
    if skew > MAX_CLOCK_SKEW_SECONDS:
        return False  # too old (or too far in the future) -- possible replay

    expected = 'sha256=' + hmac.new(
        secret.encode(),
        f'{timestamp}.{payload}'.encode(),
        hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(signature, expected)
```

---

## Best Practices

1. **Always verify signatures** in production
2. **Respond quickly** (within 5 seconds) to avoid timeouts
3. **Use HTTPS** for webhook endpoints
4. **Handle duplicates** - webhooks may be retried
5. **Log everything** for debugging
