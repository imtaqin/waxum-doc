---
sidebar_position: 16
description: Attach a session to Meta's official WhatsApp Cloud API instead of the unofficial multi-device protocol -- Embedded Signup, message dispatch, media, and the webhook receiver.
keywords:
  - WhatsApp Cloud API
  - Embedded Signup
  - Meta Graph API
  - provider
  - templates
---

# Cloud API

Every session in waxum has a `provider`: `whatsapp_web` (default -- the
unofficial multi-device protocol the rest of this API documents) or
`whatsapp_cloud` (Meta's official Business Cloud API). A `whatsapp_cloud`
session sends and receives through Meta's Graph API instead of a
WhatsApp Web socket, but reuses the same [`/messages/*`](./messages.md)
route surface wherever the two providers overlap -- an existing
integration mostly just needs a different session id to switch.

## Connect

Attach Cloud API credentials to a session and flip its provider to
`whatsapp_cloud`.

```
POST /api/v1/sessions/{session_id}/cloud/connect
```

### Request Body

```json
{
  "waba_id": "102290129340398",
  "phone_number_id": "106540352242922",
  "business_id": "102290129340399",
  "access_token": "EAAG...",
  "app_id": "1234567890",
  "app_secret": "your-meta-app-secret",
  "webhook_verify_token": "a-token-you-choose"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `waba_id` | Yes | WhatsApp Business Account ID |
| `phone_number_id` | Yes | Phone number ID to send/receive through |
| `business_id` | No | Meta Business ID that owns the WABA |
| `access_token` | Yes | System-user or Embedded-Signup-exchanged access token |
| `app_id` | No | Meta app ID your webhook is registered under |
| `app_secret` | Yes | Meta app secret -- verifies `X-Hub-Signature-256` on inbound webhooks |
| `webhook_verify_token` | Yes | Echoed back on the webhook `GET` verification handshake |

`access_token`, `app_secret` and `webhook_verify_token` are write-only:
they are stored, but **never** returned by this or any other `GET`
response -- including `GET /sessions/{id}` and `GET /sessions`. Only the
non-secret identifiers come back:

### Response

```json
{
  "session": {
    "id": "my-cloud-session",
    "provider": "whatsapp_cloud",
    "cloud_waba_id": "102290129340398",
    "cloud_phone_number_id": "106540352242922",
    "cloud_business_id": "102290129340399",
    "cloud_app_id": "1234567890"
  }
}
```

---

## Embedded Signup

Embedded Signup is Meta's client-side onboarding flow: your frontend
loads Meta's JS SDK, the client-business owner logs into their own Meta
Business account in a popup, and the SDK's `message` event hands your
page back an OAuth `code` plus the new WABA's id. This endpoint finishes
onboarding server-side:

```
POST /api/v1/sessions/{session_id}/cloud/embedded-signup/exchange
```

### Request Body

```json
{
  "code": "the-oauth-code-from-the-js-sdk-callback",
  "app_id": "1234567890",
  "app_secret": "your-meta-app-secret",
  "waba_id": "the-waba-id-from-the-js-sdk-callback"
}
```

Runs three calls against the Graph API in sequence: exchanges `code` for
an access token, subscribes your app to the WABA's webhooks
(`POST {waba_id}/subscribed_apps`), then lists the WABA's phone numbers
so you can show the caller a picker.

### Response

```json
{
  "access_token": "EAAG...",
  "waba_id": "102290129340398",
  "phone_numbers": {
    "data": [
      { "id": "106540352242922", "display_phone_number": "+1 555 0100", "verified_name": "Acme Support" }
    ]
  }
}
```

This endpoint does **not** itself attach anything to the session --
`access_token` is returned here specifically so the caller can show a
picker over `phone_numbers`, then call
[`POST /cloud/connect`](#connect) with the number they picked and this
same `access_token`.

---

## Sending Messages

A `whatsapp_cloud` session reuses the existing
[`/messages/*`](./messages.md) endpoints for every message type the
Cloud API supports: `text`, `image`, `video`, `audio`, `document`,
`sticker`, `location`, `contact`, `react`, `buttons`, `list`, and
`read`. Request/response shapes are identical to a `whatsapp_web`
session's -- the provider switch is transparent at the request level.
Two differences worth knowing:

- **Media by URL or base64**, not by whatsapp-rust's pre-uploaded
  pointer. `image`/`video`/`audio`/`document`/`sticker` accept
  `{"url": "..."}` (sent as a Cloud API `link`) or
  `{"data": "<base64>", "mimetype": "..."}` (uploaded to the Cloud API
  first, then sent by the resulting media id). A whatsapp-rust
  `{"url": ..., "direct_path": ..., "media_key": ..., ...}` pointer from
  [`POST /media/upload`](./media.md#upload-media) has no Cloud API
  equivalent and is rejected with `400`.
- **Endpoints with no Cloud API equivalent** -- groups, polls, calls,
  presence, and the rest of the Web-only surface -- return the same
  `503` a `whatsapp_web` session would get from an unconnected socket,
  since a `whatsapp_cloud` session never opens one either. This is a
  known rough edge for those specific endpoints (they were never meant
  to be called on a Cloud session in the first place); every message
  type listed above dispatches for real.

### Send a Template Message

Cloud-only -- there is no Web-protocol equivalent, since templates are a
Cloud API / Business Solution concept.

```
POST /api/v1/sessions/{session_id}/messages/template
```

```json
{
  "to": "15551234567",
  "name": "order_confirmation",
  "language_code": "en_US",
  "components": [
    {
      "type": "body",
      "parameters": [{ "type": "text", "text": "Ada" }]
    }
  ]
}
```

`components` is passed through to the Cloud API verbatim -- see Meta's
message-template component reference for the full parameter grammar
(text, currency, date_time, media headers, quick-reply button
payloads, ...). Returns `400` on a `whatsapp_web` session.

---

## Media

Cloud API media has no shared shape with whatsapp-rust's upload
pointers (`direct_path`/`media_key`/`file_sha256`/...), so it gets its
own routes rather than overloading [`/media/upload`](./media.md):

```
POST   /api/v1/sessions/{session_id}/cloud/media
GET    /api/v1/sessions/{session_id}/cloud/media/{media_id}
GET    /api/v1/sessions/{session_id}/cloud/media/{media_id}/download
DELETE /api/v1/sessions/{session_id}/cloud/media/{media_id}
```

`POST /cloud/media` is a multipart upload (field name `file`) that
returns `{"id": "..."}`. `GET .../{media_id}` resolves that id to its
metadata and a short-lived signed URL. `GET .../{media_id}/download`
resolves and fetches the bytes in one call, streaming them back as the
response body. `DELETE .../{media_id}` removes it from Meta's storage.
All four `400` on a `whatsapp_web` session.

---

## Webhook Receiver

Meta delivers inbound messages and status updates to a per-session
endpoint you register on your Meta app's dashboard:

```
GET  /api/v1/sessions/{session_id}/cloud/webhook
POST /api/v1/sessions/{session_id}/cloud/webhook
```

Both bypass waxum's normal bearer-auth check -- Meta calls them
directly and only ever presents its own proof, never a waxum token.

**`GET`** is Meta's one-time verification handshake, sent when you
register or change the webhook URL: it carries `hub.mode`,
`hub.verify_token`, and `hub.challenge` query params. waxum echoes
`hub.challenge` back with `200` when `hub.mode == "subscribe"` and
`hub.verify_token` matches the session's `webhook_verify_token` from
[`/cloud/connect`](#connect); otherwise `403`.

**`POST`** is an actual delivery, signed with
`X-Hub-Signature-256: sha256=<hmac>` over the raw body, keyed by the
session's `app_secret` -- **a completely different scheme** from
waxum's own [outbound webhook signing](./webhooks.md#signature-verification)
(`X-Webhook-Signature`, timestamp-prefixed). A bad or missing signature
gets `401` before the body is even parsed.

Inbound `messages[]` entries are normalized into the exact same
[`message` event shape](./webhooks.md#message-event) your existing
`whatsapp_web` webhook consumer already handles -- `from`,
`from_phone`, `chat`, `chat_phone`, `message_id`, `is_from_me`,
`push_name`, `message_type`, `text`, `caption`, `media`, `location`,
`is_group` (always `false` -- the Cloud API has no group messaging),
`quoted_message_id`, `quoted_sender_jid` -- and fanned out through the
same [webhook registrations](./webhooks.md) and retry/DLQ pipeline as
any other session. `statuses[]` delivery-status updates (sent/delivered
/read/failed) are not yet mapped to a webhook event of their own.

---

## What's Not Here Yet

Flows, the Payments API, Commerce/Catalog, QR codes, Analytics,
Billing, Business Compliance, Block Users, and BSP credit-line sharing
are all out of scope for this pass -- each is planned as its own,
separately scoped addition.
