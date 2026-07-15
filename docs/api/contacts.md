---
sidebar_position: 3
---

# Contacts

Manage contacts and check WhatsApp availability.

## List Stored Contacts (v0.6.1+)

Paginated dump of the contact directory waxum has built locally for the
session. Populated automatically as a side-effect of the event stream
— no `usync` round-trip on read.

```
GET /api/v1/sessions/{session_id}/contacts
```

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `q` | string | — | Substring filter over `full_name`, `first_name`, `push_name`, `phone`, `business_name` |
| `limit` | int | `100` | Page size, clamped 1–1000 |
| `offset` | int | `0` | Page offset |

### Response

```json
{
  "contacts": [
    {
      "jid": "628xxxxxxxxxx@s.whatsapp.net",
      "phone": "628xxxxxxxxxx",
      "lid_jid": "20045283487834@lid",
      "full_name": "John Doe",
      "first_name": "John",
      "push_name": "John",
      "business_name": null,
      "source": "appstate_sync",
      "updated_at": "2026-06-11 14:32:08"
    }
  ],
  "total": 1247,
  "limit": 100,
  "offset": 0
}
```

### `source` values

| Value | Meaning |
|-------|---------|
| `appstate_sync` | Captured from a full appstate sync (initial backfill or remote re-sync). |
| `appstate` | Incremental appstate mutation (single contact edited on the phone). |
| `notification` | `<notification type="contacts"><update/>` server push. |
| `push_name` | `PushNameUpdate` event (sender renamed themselves). |
| `message` | Inbound message — phone + push_name surfaced from the wire. |

::: tip Empty list right after pair?
On a fresh pair the table starts empty and fills as appstate sync
progresses + chats come in. WhatsApp doesn't expose the full
address-book in one shot via the socket — this is the same model WA
Web uses internally.
:::

::: warning Privacy
The directory is **per session** and stored on your waxum database.
Don't expose this endpoint to untrusted callers — `full_name` here is
the saved name from the phone's address book.
:::

---

## Check on WhatsApp

Check if phone numbers are registered on WhatsApp.

```
POST /api/v1/sessions/{session_id}/contacts/check
```

### Request Body

```json
{
  "phones": ["628123456789", "628987654321"]
}
```

### Response

```json
{
  "results": [
    {
      "phone": "628123456789",
      "exists": true,
      "jid": "628123456789@s.whatsapp.net"
    },
    {
      "phone": "628987654321",
      "exists": false,
      "jid": null
    }
  ]
}
```

---

## Get Contact Info

Get contact information.

```
POST /api/v1/sessions/{session_id}/contacts/info
```

### Request Body

```json
{
  "jid": "628123456789@s.whatsapp.net"
}
```

### Response

```json
{
  "jid": "628123456789@s.whatsapp.net",
  "name": "John Doe",
  "notify": "Johnny",
  "verified_name": null
}
```

---

## Get Profile Picture

Get contact's profile picture URL.

```
GET /api/v1/sessions/{session_id}/contacts/{jid}/picture
```

### Response

```json
{
  "url": "https://pps.whatsapp.net/...",
  "id": "123456789"
}
```

---

## Get User Info

Get detailed user information for multiple contacts.

```
POST /api/v1/sessions/{session_id}/contacts/users
```

### Request Body

```json
{
  "jids": [
    "628123456789@s.whatsapp.net",
    "628987654321@s.whatsapp.net"
  ]
}
```

### Response

```json
{
  "users": [
    {
      "jid": "628123456789@s.whatsapp.net",
      "verified_name": "Business Name",
      "picture_id": "123456789"
    }
  ]
}
```

---

## JID Format

WhatsApp uses JID (Jabber ID) format for identifiers:

| Type | Format | Example |
|------|--------|---------|
| User | `{phone}@s.whatsapp.net` | `628123456789@s.whatsapp.net` |
| Group | `{id}@g.us` | `123456789-1234567890@g.us` |
| Broadcast | `{id}@broadcast` | `status@broadcast` |
