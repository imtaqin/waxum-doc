---
sidebar_position: 1
description: Create, list, pair, connect, disconnect, and delete WhatsApp sessions -- each session is one independently connected WhatsApp account.
keywords:
  - sessions
  - QR pairing
  - pair code
  - connect
  - disconnect
  - multi-session
---

# Sessions

Manage WhatsApp sessions. Each session represents a connected WhatsApp account.

## Create Session

Creates a new session and automatically starts connecting to WhatsApp.

```
POST /api/v1/sessions
```

### Request Body

```json
{
  "id": "my-session",
  "name": "My Business Account",
  "webhook": {
    "url": "https://example.com/webhook",
    "events": ["message", "connected"],
    "secret": "webhook-secret"
  },
  "device": {
    "os": "Windows",
    "platform": "desktop"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | No | Custom session ID (auto-generated if not provided) |
| `name` | string | No | Friendly name for the session |
| `reuse` | boolean | No | Re-scan an existing session ID instead of failing — see below |
| `webhook` | object | No | Webhook configuration |
| `webhook.url` | string | Yes* | Webhook URL |
| `webhook.events` | array | No | Events to subscribe (default: all) |
| `webhook.secret` | string | No | HMAC secret for signature verification |
| `device` | object | No | Per-session device identity override (see [Device Identity](#device-identity)) |
| `device.os` | string | No | OS label shown in WhatsApp Linked Devices, e.g. `Windows`, `Mac OS X`, `Ubuntu` |
| `device.platform` | string | No | Platform type — see table in [Device Identity](#device-identity) |
| `device.version` | string | No | Dotted app version, e.g. `2.3000.1023902713`. Omit to use library default |

### Reusing an existing session ID (`reuse`, v0.12.0+)

By default, creating a session with an ID that already exists returns
`409`. Pass `"reuse": true` to instead keep the original `session_id`
and re-start the connect flow (QR/pair re-scan) on the same slot —
the response is `200` with the existing session. `name` and `webhook`
fields are ignored on reuse; update those via their own endpoints.
`reuse` has no effect when the ID does not exist yet.

### Response

```json
{
  "session": {
    "id": "my-session",
    "name": "My Business Account",
    "phone_number": null,
    "push_name": null,
    "status": "connecting",
    "created_at": 1767143203,
    "updated_at": 1767143203,
    "last_connected_at": null,
    "is_logged_in": false
  }
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "id": "business-1",
    "name": "Business Account",
    "webhook": {
      "url": "https://example.com/webhook"
    }
  }'
```

---

## List Sessions

Get all sessions.

```
GET /api/v1/sessions
```

### Response

```json
{
  "sessions": [
    {
      "id": "my-session",
      "name": "My Account",
      "status": "logged_in",
      "is_logged_in": true
    }
  ],
  "total": 1
}
```

---

## Get Session

Get a specific session by ID.

```
GET /api/v1/sessions/{session_id}
```

### Response

```json
{
  "id": "my-session",
  "name": "My Account",
  "phone_number": "628123456789",
  "push_name": "John Doe",
  "status": "logged_in",
  "is_logged_in": true
}
```

---

## Delete Session

Delete a session and everything stored for it. This cannot be undone.
To unlink the phone and keep the session, use [Log Out](#log-out).

```
DELETE /api/v1/sessions/{session_id}
```

### Cascade behaviour

Session delete cascades on both storage layers:

- **DB rows** — child rows in `webhooks`, `contacts`, and `webhook_dlq`
  scoped to this `session_id` are dropped explicitly before the
  `sessions` row is removed. This runs even on databases whose tables
  were migrated in without an `ON DELETE CASCADE` constraint, so no
  orphans are left behind.
- **In-memory registry** — every webhook registration pointing at this
  session is removed from the dispatcher, along with any open circuit
  state for those URLs.
- **Storage directory** — the on-disk session store under
  `WHATSAPP_STORAGE_PATH/{session_id}` is unlinked.

### Response

```json
{
  "success": true,
  "message": "Session deleted"
}
```

---

## Get Session Status

Get current connection status.

```
GET /api/v1/sessions/{session_id}/status
```

### Response

```json
{
  "status": "logged_in",
  "is_logged_in": true,
  "socket_alive": true,
  "paused": false,
  "phone_number": "628123456789",
  "push_name": "John Doe",
  "diagnostics": {
    "last_data_received_at": 1759140000,
    "client_frames_received": 5120,
    "client_messages_received": 212,
    "client_messages_suppressed_duplicate": 0,
    "client_events_dropped": 0,
    "client_reconnects": 1,
    "client_reconnect_errors": 0,
    "messages_forwarded": 212,
    "last_message_forwarded_at": 1759139990,
    "webhooks": [
      {
        "id": "wh_1",
        "url": "https://example.com/hook",
        "enabled": true,
        "receives_messages": true,
        "circuit_open": false,
        "consecutive_failures": 0,
        "retry_in_seconds": null,
        "last_error": null,
        "skipped_while_suspended": 0
      }
    ],
    "new_chats": {
      "last_3h": 2,
      "last_6h": 5,
      "last_12h": 9,
      "last_24h": 14
    }
  }
}
```

| Field | Description |
|-------|-------------|
| `socket_alive` | Raw socket liveness (v0.12.0+). Distinct from `is_logged_in`: a cached `logged_in` status can outlive a dead socket ("limbo"), and a live socket can precede login during QR/pair flows. |
| `paused` | `true` after [Pause Session](./operations.md#pause-session) — the session is deliberately offline until resumed. |
| `diagnostics` | Where inbound traffic stops (v0.13.2+); see below. |

#### Diagnosing "connected but no webhooks"

`diagnostics` follows a message from the socket to your webhook, so
you can see which step stopped:

| Check | Means |
|-------|-------|
| `last_data_received_at` is old | the socket has gone quiet |
| `client_messages_received` doesn't grow while messages arrive | the client isn't decrypting or dispatching |
| `client_messages_received` grows but `messages_forwarded` doesn't | waxum isn't forwarding |
| `messages_forwarded` grows but your server gets nothing | look at `webhooks[]`: `circuit_open: true` ([suspended after failed deliveries](./webhooks.md#suspension-after-failed-deliveries); `last_error` says why and `retry_in_seconds` when it is tried again), `enabled: false` (you disabled it), or `receives_messages: false` |

- **`client_*` fields** come from the WhatsApp client. They are `null` when no client is running in this process, and reset whenever it is rebuilt (e.g. by connect).
- **`messages_forwarded`** counts since the process started.

### Status Values

| Status | Description |
|--------|-------------|
| `disconnected` | Not connected |
| `connecting` | Establishing connection |
| `waiting_for_qr` | Waiting for QR code scan |
| `waiting_for_pair_code` | Waiting for pair code entry |
| `connected` | Connected but not logged in |
| `logged_in` | Fully authenticated |

---

## Get QR Code

Get QR codes for authentication.

```
GET /api/v1/sessions/{session_id}/qr
```

### Response

```json
{
  "qr_codes": ["2@ABC123..."],
  "timeout_seconds": 60,
  "status": "waiting_for_qr"
}
```

---

## Connect Session

Manually trigger connection (usually not needed as create auto-connects).

```
POST /api/v1/sessions/{session_id}/connect
```

### Request Body (optional)

Accepts an optional device identity override. Same shape as `device` in
[Create Session](#create-session). The override only takes effect on the
first successful pair — subsequent reconnects reuse the props that
whatsapp-rust persisted at pair time.

```json
{
  "device": {
    "os": "Windows",
    "platform": "desktop"
  }
}
```

Empty body is fine — falls back to environment defaults (`WA_DEVICE_OS`,
`WA_DEVICE_PLATFORM`, `WA_DEVICE_VERSION`).

:::tip Lifts an account-lock cooldown
When WhatsApp locks an account, auto-reconnect pauses with an escalating
cooldown (see the [`account_locked`](./webhooks.md#account-locked-event)
webhook event). A manual `POST /connect` is the intended way out — it
clears the cooldown and reconnects immediately.
:::

---

## Pair with Phone Number

Connect using pair code instead of QR.

Only for a session that is not linked yet. A session that already holds a
WhatsApp login gets `409` (since v0.13.6 this holds even while it is
reconnecting); use `POST .../connect` to bring it back online.

```
POST /api/v1/sessions/{session_id}/pair
```

### Request Body

```json
{
  "phone_number": "+628123456789",
  "show_push_notification": true,
  "device": {
    "os": "Windows",
    "platform": "desktop"
  }
}
```

`device` is optional. See [Device Identity](#device-identity) for the
field schema and the available platform values.

### Response

```json
{
  "code": "ABCD-EFGH",
  "timeout_seconds": 60
}
```

---

## Disconnect Session

Close the connection to WhatsApp. The session stays linked: `connect`
brings it back without a new QR.

```
POST /api/v1/sessions/{session_id}/disconnect
```

---

## Log Out

*Since v0.14.0.* Remove waxum from the account's linked devices, and
keep the session.

```
POST /api/v1/sessions/{session_id}/logout
```

The session becomes dormant: its id, webhooks, settings and stored
messages are kept, only the WhatsApp login is dropped. `connect` then
shows a fresh QR, and scanning it (or [pairing by code](#pair-with-phone-number))
continues the same session, with the same number or a different one.

`400` on a `whatsapp_cloud` session, which has no linked device.

### Dormant sessions

A session is never deleted unless you call [Delete Session](#delete-session)
or the bulk purge. In particular:

- When WhatsApp logs the device out (removed from the phone, or the
  account is restricted), the session goes dormant the same way as
  after `logout`. Up to v0.13.6 a repeated logout deleted the session
  together with its webhooks and history.
- A dormant session reports `status: "disconnected"`,
  `is_logged_in: false`.
- Its webhooks are loaded at startup like any other session's, so they
  are in place the moment it is linked again.

---

## New-chat Limit

*Since v0.14.0. Linked-device sessions only.*

WhatsApp restricts accounts that start too many conversations with
numbers they have never talked to, and unlinks every companion device
when it does. The threshold is not published and differs per account.
waxum counts what it can see, records the count whenever WhatsApp logs
the session out, and lets you set a ceiling.

A chat counts as **new** when the session sends to a direct chat it has
no history with: no earlier send through waxum and no stored message in
either direction. Groups never count, and neither does replying to
someone who wrote first.

```
GET    /api/v1/sessions/{session_id}/settings/new-chat-limit
PUT    /api/v1/sessions/{session_id}/settings/new-chat-limit
DELETE /api/v1/sessions/{session_id}/settings/new-chat-limit
```

### Set a limit

```json
{
  "max_new_chats": 40,
  "window_hours": 24
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `max_new_chats` | integer | Yes | New chats allowed inside the window. At least 1. |
| `window_hours` | integer | No | Rolling window, 1 to 720. Defaults to 24. |

No limit is set by default, and nothing is refused until you set one.
`DELETE` removes it; the counting continues either way.

### When the limit is reached

A send to a number the session has no chat with is refused:

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3120
```

```json
{
  "success": false,
  "error": {
    "code": 429,
    "message": "New-chat limit reached: 40 new chats per 24 h. Existing chats are not affected. Retry in 3120 s."
  }
}
```

Sends in existing chats, replies and group sends keep working, as do
edits, reactions and revokes. A send that fails is not counted. Sends
through NATS follow the same rule and get a failed `send_result`.

### Response

All three methods return the current state:

```json
{
  "limit": { "max_new_chats": 40, "window_hours": 24 },
  "new_chats": { "last_3h": 2, "last_6h": 5, "last_12h": 9, "last_24h": 14 },
  "retry_after_seconds": null,
  "incidents": [
    {
      "occurred_at": 1791422622,
      "reason": "LoggedOut",
      "new_chats": { "last_3h": 31, "last_6h": 44, "last_12h": 52, "last_24h": 61 }
    }
  ]
}
```

`incidents` holds the figures at each logout by WhatsApp, newest first.
After a few of them you can read this account's threshold off the
numbers and set the limit below it. The same figures are in
`diagnostics.new_chats` of [Get Session Status](#get-session-status),
and in the `account_locked` webhook event.

:::caution
waxum counts only what is sent through it. Chats started from the phone
or WhatsApp Web on the same account are not included, so the number
WhatsApp acts on can be higher than the one reported here.
:::

---

## Get Device Info

Get connected device information.

```
GET /api/v1/sessions/{session_id}/device
```

### Response

```json
{
  "device_id": 1,
  "phone_number": "628123456789",
  "lid": "123456789@lid",
  "push_name": "John Doe"
}
```

---

## Session Tags

Free-form short strings an operator attaches to a session to organise
a fleet — e.g. `cs`, `blast-campaign-2`, `client:acme`, `region:jkt`.
Added in v0.7.13.

:::note In-memory, not a DB table
Tags live in-memory on the running instance and are snapshotted to
`{WHATSAPP_STORAGE_PATH}/session_tags.json` on every mutation, so a
restart reloads them from that file rather than losing them. They are
not stored in the SQL database alongside sessions/messages/etc. Not on
the send hot path — tags are only consulted when `?tag=` is present on
[List Sessions](#list-sessions), or by the console's overview
grouping.
:::

### List Session Tags

```
GET /api/v1/sessions/{session_id}/tags
```

### Response

```json
{
  "session_id": "my-session",
  "tags": ["cs", "region:jkt"]
}
```

### Replace Session Tags

Overwrites the full tag set for a session.

```
PUT /api/v1/sessions/{session_id}/tags
```

#### Request Body

```json
{
  "tags": ["cs", "region:jkt", "client:acme"]
}
```

#### Response

Same shape as [List Session Tags](#list-session-tags).

### Add Session Tag

Adds a single tag without disturbing the rest of the set.

```
POST /api/v1/sessions/{session_id}/tags
```

#### Request Body

```json
{
  "tag": "priority"
}
```

#### Response

```json
{
  "session_id": "my-session",
  "tag": "priority",
  "changed": true,
  "tags": ["cs", "region:jkt", "priority"]
}
```

`changed` is `false` when the tag was already present.

### Remove Session Tag

```
DELETE /api/v1/sessions/{session_id}/tags/{tag}
```

#### Response

Same shape as [Add Session Tag](#add-session-tag), with `changed`
reflecting whether the tag was actually present to remove.

### List All Tags

Every distinct tag across the fleet, with how many sessions carry it.

```
GET /api/v1/tags
```

#### Response

```json
[
  { "tag": "cs", "session_count": 8 },
  { "tag": "region:jkt", "session_count": 3 }
]
```

Sorted by `session_count` descending, then alphabetically.

### Filter Sessions by Tag

[List Sessions](#list-sessions) accepts a `?tag=` query parameter to
restrict results to sessions carrying that tag:

```
GET /api/v1/sessions?tag=region:jkt
```

Deleting a session also drops its tags from the in-memory registry and
the JSON snapshot.

---

## Session Export / Import

Move a session's local device identity and credentials between waxum
instances — an explicit, operator-triggered migration. Added in
v0.9.3.

:::warning Not multi-instance failover
`whatsapp-rust`'s storage is local-SQLite-only; it has no networked
storage backend. Export/import is a manual, one-shot copy — not
transparent failover or live replication between instances. WhatsApp
also does not allow the same device credentials to be live on two
places at once, so export always disconnects the source session first.
:::

### Export Session

Packages the session's local storage directory (device identity,
Signal protocol keys, noise handshake state — everything
`whatsapp-rust` itself persists to disk) as a zip and streams it back.

```
POST /api/v1/sessions/{session_id}/export
```

Disconnects the session first — the underlying device credentials must
never be live on two waxum instances simultaneously, so export always
leaves the source session `disconnected` as a side effect, even if it
was `logged_in` a moment earlier.

#### Response

`200` with `Content-Type: application/zip` and a
`Content-Disposition: attachment; filename="{session_id}.waxum-session.zip"`
header. The body is the zip archive — not JSON.

### Import Session

Restores a session's local storage directory from an export zip, e.g.
after copying it to a different waxum instance.

```
POST /api/v1/sessions/{session_id}/import
```

The target session id must already exist (create it first if needed).
Upload as `multipart/form-data` with the zip in a field named `file`:

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@my-session.waxum-session.zip"
```

#### Response

```json
{
  "success": true,
  "message": "Session storage imported — call /connect to bring it online"
}
```

Notes:
- Refuses to run (`409`) if the target session is currently connected
  on this instance — disconnect it first, or import into a fresh
  session id.
- Does **not** auto-reconnect. Call
  [Connect Session](#connect-session) afterwards to bring it online.
- Zip entries are validated against path traversal ("zip-slip") before
  extraction; unsafe entries abort the import with `400`.

---

## Device Identity

Controls how each session appears in WhatsApp's **Linked Devices** list at
pair time (the OS string + platform icon). The default is `Windows` /
`desktop`, which displays as **WhatsApp Desktop** rather than a browser
client.

### Where it applies

- `POST /api/v1/sessions` — `device` field in the create body
- `POST /api/v1/sessions/{id}/connect` — optional body with a `device` field
- `POST /api/v1/sessions/{id}/pair` — `device` field alongside `phone_number`

### Important caveat

Device props are **only honored on the first pair**. Once a device is
registered with WhatsApp, the gateway persists the props in its SQLite
store and reuses them on every reconnect. To change the identity of an
already-paired session, delete it and pair again.

### Field schema

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `os` | string | `Windows` | Free-form OS label shown in WA |
| `platform` | string | `desktop` | One of the platform values below |
| `version` | string | _library default_ | Dotted version like `2.3000.1023902713`. Leave unset unless you have a specific reason — forcing a version has been observed to cause silent server-side drops on freshly-paired sessions. |

### Platform values

| Value | Linked Devices icon |
|-------|---------------------|
| `desktop` | WhatsApp Desktop (default) |
| `uwp` | Windows Store app |
| `chrome` | Google Chrome |
| `firefox` | Mozilla Firefox |
| `edge` | Microsoft Edge |
| `safari` | Safari |
| `opera` | Opera |
| `ie` | Internet Explorer |
| `ipad` | iPad |
| `ios_phone` | iPhone |
| `android_phone` | Android Phone |
| `android_tablet` | Android Tablet |

Unknown values fall back to `desktop`.

### Environment fallback

When no `device` field is sent, the gateway falls back to these env vars:

```
WA_DEVICE_OS=Windows
WA_DEVICE_PLATFORM=desktop
WA_DEVICE_VERSION=               # omit for library default
```
