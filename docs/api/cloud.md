---
sidebar_position: 16
description: Run a session on Meta's official WhatsApp Cloud API -- Embedded Signup, messages, templates, Flows, commerce, payments, QR codes, analytics, and BSP credit sharing.
keywords:
  - WhatsApp Cloud API
  - Embedded Signup
  - Meta Graph API
  - provider
  - templates
  - WhatsApp Flows
  - WhatsApp Commerce
  - WhatsApp Payments
  - BSP
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

From the built-in console at `/`, **New session → Cloud API** creates
the session and attaches credentials in one step. The session's page
then shows the webhook callback URL and the Flow endpoint URL to paste
into your Meta app.

The console marks the two kinds of session apart everywhere (blue
**Cloud API**, green **WhatsApp Web**). In a session's API explorer the
endpoints its channel cannot serve are listed last, greyed out, with
the channel they need: on a Cloud API session that is everything that
requires a linked device (groups, calls, contacts, presence, QR
pairing, logout, the new-chat limit).

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
any other session.

A few Cloud-only fields are added on top of that shape. Each is `null`
unless it applies:

| Field | Set when |
|-------|----------|
| `interactive` | `message_type: "interactive"` -- Meta's object as-is: `button_reply`, `list_reply` or `nfm_reply` |
| `flow_response` | A [Flow](#flows) was completed -- `nfm_reply.response_json`, parsed into an object |
| `order` | `message_type: "order"` -- a cart sent from your [catalog](#commerce): `catalog_id`, `product_items`, `text` |
| `referred_product` | The customer wrote from a product's "Message business" button: `catalog_id`, `product_retailer_id` |

### Delivery and payment status (`receipt`)

`statuses[]` updates become `receipt` events, one per status:

```json
{
  "session_id": "my-cloud-session",
  "event": "receipt",
  "data": {
    "provider": "whatsapp_cloud",
    "message_id": "wamid.HBgL...",
    "recipient": "15551234567",
    "status": "failed",
    "timestamp": 1700000000,
    "type": null,
    "errors": [{ "code": 131047, "title": "Re-engagement message" }],
    "conversation": null,
    "pricing": null,
    "payment": null
  }
}
```

`status` is `sent`, `delivered`, `read` or `failed`. For a
[payment](#payments) it is `captured`, `pending` or `failed`, with
`type: "payment"` and `payment.reference_id` set. `errors`,
`conversation` and `pricing` are passed through from Meta when present.

---

## Flows

[WhatsApp Flows](https://developers.facebook.com/docs/whatsapp/flows)
are multi-screen forms that run inside the chat.

### Manage Flows

```
GET    /api/v1/sessions/{session_id}/cloud/flows
POST   /api/v1/sessions/{session_id}/cloud/flows
GET    /api/v1/sessions/{session_id}/cloud/flows/{flow_id}
POST   /api/v1/sessions/{session_id}/cloud/flows/{flow_id}
DELETE /api/v1/sessions/{session_id}/cloud/flows/{flow_id}
PUT    /api/v1/sessions/{session_id}/cloud/flows/{flow_id}/json
GET    /api/v1/sessions/{session_id}/cloud/flows/{flow_id}/assets
POST   /api/v1/sessions/{session_id}/cloud/flows/{flow_id}/publish
POST   /api/v1/sessions/{session_id}/cloud/flows/{flow_id}/deprecate
GET    /api/v1/sessions/{session_id}/cloud/flows/{flow_id}/metrics
POST   /api/v1/sessions/{session_id}/cloud/flows-migrate
```

- **Create** takes `{"name", "categories": ["APPOINTMENT_BOOKING", ...], "clone_flow_id"?}` and creates a draft.
- **`POST .../{flow_id}`** updates `name`, `categories` or `endpoint_uri`.
- **`PUT .../json`** takes the Flow JSON document as the request body.
- **Publish** is irreversible. Only draft Flows can be deleted.
- **`metrics`** takes `?metric=ENDPOINT_REQUEST_COUNT&granularity=DAY&since=2026-01-01&until=2026-01-31`. `metric` is one of `ENDPOINT_REQUEST_COUNT`, `ENDPOINT_REQUEST_ERROR`, `ENDPOINT_REQUEST_ERROR_RATE`, `ENDPOINT_REQUEST_LATENCY_SECONDS_CEIL` or `ENDPOINT_AVAILABILITY`.
- **`flows-migrate`** copies Flows from another WABA: `{"source_waba_id", "source_flow_names"?}`.

### Send a Flow

```
POST /api/v1/sessions/{session_id}/cloud/flows/{flow_id}/send
```

```json
{
  "to": "15551234567",
  "flow_cta": "Book now",
  "body": "Pick a time for your appointment",
  "header": "Acme Clinic",
  "flow_token": "booking-7f3a",
  "mode": "published",
  "flow_action": "navigate",
  "screen": "WELCOME",
  "data": { "name": "Ada" }
}
```

`flow_action` is `navigate` (the default; opens `screen` directly, which
is then required) or `data_exchange` (asks your Flow endpoint for the
first screen). `mode: "draft"` only delivers to the WABA's test numbers.
When the user submits, the answers arrive as a `message` event with
[`flow_response`](#webhook-receiver) set.

### Flow endpoint (Data Exchange)

Flows that fetch data between screens call an endpoint you host. waxum
can be that endpoint: it handles Meta's encryption and forwards each
decrypted request to your own backend as plain JSON.

```
POST /api/v1/sessions/{session_id}/cloud/flow-endpoint
GET  /api/v1/sessions/{session_id}/cloud/flow-endpoint/public-key
POST /api/v1/sessions/{session_id}/cloud/flow-endpoint/exchange
```

**Configure** the endpoint once:

```json
{
  "forward_url": "https://example.com/flows/handler",
  "private_key": "-----BEGIN PRIVATE KEY-----\n..."
}
```

- **`private_key`** is optional. Omit it and waxum generates a 2048-bit RSA key itself, so the private key never leaves the server. PKCS#8 and PKCS#1 PEM are both accepted.
- **Registration.** The public half is registered with Meta for you, and returned in the response.
- **Storage.** The private key is stored on the session and never returned by any `GET`.
- **`forward_url`** must be a public `http(s)` URL. It is checked by the same SSRF guard as webhooks.

Then set the Flow's `endpoint_uri` (via `POST .../flows/{flow_id}`) to
`https://<your-waxum-host>/api/v1/sessions/{session_id}/cloud/flow-endpoint/exchange`.

**`/exchange`** is called by Meta directly and bypasses bearer auth,
like the webhook. For each request, waxum does the following:

1. Verifies `X-Hub-Signature-256` against the session's `app_secret`. On failure it returns `432`.
2. Decrypts: RSA-OAEP-SHA256 unwraps the AES-128 key, then AES-128-GCM decrypts the payload using Meta's 16-byte IV. Any decryption failure returns `421`, which makes Meta re-fetch the public key.
3. Answers Meta's `ping` health check itself.
4. POSTs every other request (`INIT`, `data_exchange`, `BACK`) to `forward_url` as JSON, with an `X-Waxum-Session-Id` header. Your reply, e.g. `{"screen": "CONFIRM", "data": {...}}`, is encrypted with the flipped IV and returned to Meta.

With no `forward_url` configured, only `ping` is answered and other
requests get `503`.

---

## Commerce

```
GET  /api/v1/sessions/{session_id}/cloud/commerce-settings
POST /api/v1/sessions/{session_id}/cloud/commerce-settings
POST /api/v1/sessions/{session_id}/messages/product
POST /api/v1/sessions/{session_id}/messages/product-list
POST /api/v1/sessions/{session_id}/messages/catalog
```

- **`commerce-settings`** toggles `is_cart_enabled` and `is_catalog_visible`.
- **Single product:** `{"to", "catalog_id", "product_retailer_id", "body"?, "footer"?}`.
- **Multi-product:** `header` and `body` are required, plus `sections: [{"title", "product_retailer_ids": [...]}]`. Meta's limits are checked before the request is sent: at most 10 sections and 30 products, and every section needs a title and at least one product.
- **Catalog:** `{"to", "body", "footer"?, "thumbnail_product_retailer_id"?}`.

A cart the customer sends back arrives as a `message` event with
[`order`](#webhook-receiver) set.

---

## Payments

India (UPI / payment gateways) and Singapore only.

```
POST /api/v1/sessions/{session_id}/messages/order-details
POST /api/v1/sessions/{session_id}/messages/order-status
```

**`order-details`** takes:

```json
{
  "to": "919876543210",
  "region": "IN",
  "body": "Your order",
  "footer": "Thanks!",
  "header": { "type": "image", "image": { "link": "https://..." } },
  "parameters": {
    "reference_id": "order-1001",
    "type": "digital-goods",
    "payment_type": "upi",
    "payment_configuration": "my-payment-config",
    "currency": "INR",
    "total_amount": { "value": 50000, "offset": 100 },
    "order": { "status": "pending", "items": [], "subtotal": { "value": 50000, "offset": 100 } }
  }
}
```

`parameters` is Meta's payment object as-is. `region` is `IN` (the
default) or `SG`; waxum nests the message the way each region expects.

**`order-status`** takes `{"to", "body", "reference_id", "status",
"description"?}`, where `status` is e.g. `processing`, `shipped`,
`completed` or `canceled`. Payment results arrive as
[`receipt`](#delivery-and-payment-status-receipt) events.

---

## Templates

```
GET    /api/v1/sessions/{session_id}/cloud/templates
POST   /api/v1/sessions/{session_id}/cloud/templates
DELETE /api/v1/sessions/{session_id}/cloud/templates?name=...&hsm_id=...
GET    /api/v1/sessions/{session_id}/cloud/templates/namespace
GET    /api/v1/sessions/{session_id}/cloud/templates/{template_id}
POST   /api/v1/sessions/{session_id}/cloud/templates/{template_id}
```

- **List** filters on `name`, `status`, `category`, `language`, `limit`, and the `after`/`before` cursors.
- **Create** takes `{"name", "language", "category": "MARKETING" | "UTILITY" | "AUTHENTICATION", "components": [...]}`. `components` is Meta's component array (`HEADER`, `BODY`, `FOOTER`, `BUTTONS`), including catalog (`CATALOG`), multi-product (`MPM`), Flow and OTP buttons.
- **Edit** (`POST .../{template_id}`) changes `category`, `components` or `message_send_ttl_seconds`.
- **Delete** by `name` removes every language. Adding `hsm_id` removes just one.

To send a template, see [Send a Template Message](#send-a-template-message).

---

## Phone Number & Account

```
GET  /api/v1/sessions/{session_id}/cloud/phone-number
GET  /api/v1/sessions/{session_id}/cloud/phone-numbers
POST /api/v1/sessions/{session_id}/cloud/register
POST /api/v1/sessions/{session_id}/cloud/deregister
POST /api/v1/sessions/{session_id}/cloud/request-code
POST /api/v1/sessions/{session_id}/cloud/verify-code
POST /api/v1/sessions/{session_id}/cloud/two-step-pin
GET  /api/v1/sessions/{session_id}/cloud/waba
GET  /api/v1/sessions/{session_id}/cloud/owned-wabas
GET  /api/v1/sessions/{session_id}/cloud/client-wabas
GET  /api/v1/sessions/{session_id}/cloud/business-portfolio
GET  /api/v1/sessions/{session_id}/cloud/debug-token
```

- **`phone-number`** includes display name status, quality rating and messaging limit tier.
- **`register`** takes the number's 6-digit two-step PIN: `{"pin", "data_localization_region"?}`. Add `"backup": {"data", "password"}` when migrating a number off the On-Premises API.
- **`request-code`** takes `{"code_method": "SMS" | "VOICE", "locale"?}`. **`verify-code`** takes `{"code"}`. **`two-step-pin`** takes `{"pin"}`.
- **`debug-token`** shows the stored access token's scopes, expiry and WABA permissions. It never returns the token itself.
- **Business ID required.** `owned-wabas`, `client-wabas` and `business-portfolio` need the session connected with a `business_id`. Otherwise they return `400` naming the missing field.

---

## Business Profile

```
GET  /api/v1/sessions/{session_id}/cloud/business-profile
POST /api/v1/sessions/{session_id}/cloud/business-profile
POST /api/v1/sessions/{session_id}/cloud/business-profile/photo
```

**Update** takes any of `about`, `address`, `description`, `email`,
`vertical` and `websites` (at most 2). Omitted fields are left unchanged.

**`photo`** is a multipart upload (field `file`, JPEG or PNG). waxum
runs Meta's Resumable Upload API and sets the photo in one call. This
needs the session connected with an `app_id`.

---

## Typing Indicator

```
POST /api/v1/sessions/{session_id}/cloud/typing
```

`{"message_id": "wamid..."}` shows "typing…" to the customer and marks
their message as read. The indicator clears when you reply, or after
25 seconds.

---

## QR Codes

```
GET    /api/v1/sessions/{session_id}/cloud/qr-codes?format=SVG
POST   /api/v1/sessions/{session_id}/cloud/qr-codes
GET    /api/v1/sessions/{session_id}/cloud/qr-codes/{code}?format=PNG
POST   /api/v1/sessions/{session_id}/cloud/qr-codes/{code}
DELETE /api/v1/sessions/{session_id}/cloud/qr-codes/{code}
```

- **Create** takes `{"prefilled_message", "generate_qr_image": "SVG" | "PNG"}` and returns the code, its `wa.me` deep link and an image URL.
- **`POST .../{code}`** changes the prefilled message.

---

## Blocked Users

```
GET    /api/v1/sessions/{session_id}/cloud/blocked-users
POST   /api/v1/sessions/{session_id}/cloud/blocked-users
DELETE /api/v1/sessions/{session_id}/cloud/blocked-users
```

Block and unblock both take `{"users": ["15551234567", ...]}`.

---

## Webhook Subscriptions

```
GET    /api/v1/sessions/{session_id}/cloud/subscribed-apps
POST   /api/v1/sessions/{session_id}/cloud/subscribed-apps
DELETE /api/v1/sessions/{session_id}/cloud/subscribed-apps
```

A `POST` with no body subscribes your app to the WABA's webhooks.

With `{"override_callback_uri", "verify_token"}`, the WABA's webhooks go
to that URL instead of the app-level one. This is how one Meta app can
route different WABAs to different waxum sessions. Both fields are
required together, and the URL must be public.

---

## Analytics & Billing

```
GET /api/v1/sessions/{session_id}/cloud/analytics?start=1700000000&end=1702600000&granularity=DAY
GET /api/v1/sessions/{session_id}/cloud/conversation-analytics?start=...&end=...&granularity=MONTHLY&dimensions=conversation_type,conversation_direction
GET /api/v1/sessions/{session_id}/cloud/credit-lines
```

- **`start` and `end`** are Unix seconds.
- **`analytics`** returns message counts. `granularity` is `HALF_HOUR`, `DAY` or `MONTH`. Optional filters: `phone_numbers`, `country_codes`.
- **`conversation-analytics`** returns conversation counts and cost. `granularity` is `HALF_HOUR`, `DAILY` or `MONTHLY`. Optional filters: `conversation_directions`, `dimensions`, `conversation_categories`, `conversation_types`, `phone_numbers`, `country_codes`.
- **List filters** are comma-separated.
- **`credit-lines`** needs a `business_id` on the session.

---

## Business Compliance (India)

```
GET  /api/v1/sessions/{session_id}/cloud/business-compliance
POST /api/v1/sessions/{session_id}/cloud/business-compliance
```

`POST` takes:
- `entity_name`
- `entity_type` (e.g. `PRIVATE_COMPANY`, `SOLE_PROPRIETORSHIP`)
- `is_registered`
- optional `other_entity_type`, `grievance_officer_details` and `customer_care_details`

---

## Solution Partners (BSP)

These routes cover the Embedded Signup steps after the
[token exchange](#embedded-signup): giving your system user access to a
client's WABA and sharing your line of credit with it.

```
GET    /api/v1/sessions/{session_id}/cloud/system-users
GET    /api/v1/sessions/{session_id}/cloud/assigned-users
POST   /api/v1/sessions/{session_id}/cloud/assigned-users
POST   /api/v1/sessions/{session_id}/cloud/credit-sharing
GET    /api/v1/sessions/{session_id}/cloud/credit-sharing/{allocation_config_id}
DELETE /api/v1/sessions/{session_id}/cloud/credit-sharing/{allocation_config_id}
GET    /api/v1/sessions/{session_id}/cloud/credit-lines/{credit_line_id}/allocations
```

- **`assigned-users`** takes `{"user_id", "tasks": ["MANAGE"]}`.
- **`credit-sharing`** takes `{"credit_line_id", "waba_currency": "USD"}`. It attaches your credit line to the session's WABA and returns the `allocation_config_id`.
- **`GET credit-sharing/...`** confirms the share (`receiving_credential`). `DELETE` revokes it.

---

## Errors

All of the routes above return `400` on a `whatsapp_web` session. When
Meta rejects a request (a `4xx` from the Graph API), waxum returns `400`
with Meta's error body, since the request itself usually needs fixing.
A Meta `5xx` or a network failure returns `500`.
