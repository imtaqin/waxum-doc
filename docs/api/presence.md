---
sidebar_position: 6
description: Set and subscribe to WhatsApp online/offline presence, and send typing or recording chat-state indicators.
keywords:
  - presence
  - typing indicator
  - chat state
  - online status
---

# Presence & Chat State

Manage online status and typing indicators.

## Set Presence

Set your online/offline status.

```
POST /api/v1/sessions/{session_id}/presence/set
```

### Request Body

```json
{
  "status": "available"
}
```

### Status Values

| Status | Description |
|--------|-------------|
| `available` | Show as online |
| `unavailable` | Show as offline |

---

## Subscribe to Presence

Subscribe to a contact's presence updates to receive online/offline notifications.

```
POST /api/v1/sessions/{session_id}/presence/subscribe
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
  "success": true,
  "message": "Subscribed to presence updates for 628123456789@s.whatsapp.net"
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/presence/subscribe \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jid": "628123456789@s.whatsapp.net"
  }'
```

:::note
Presence updates will be delivered via webhooks when the contact comes online or goes offline.
:::

---

## Send Chat State

Send typing or recording indicator.

```
POST /api/v1/sessions/{session_id}/chatstate/send
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "state": "composing"
}
```

### State Values

| State | Description |
|-------|-------------|
| `composing` | Typing... |
| `recording` | Recording audio... |
| `paused` | Stop indicator |

---

## Send Typing Indicator

Shorthand for sending typing indicator.

```
POST /api/v1/sessions/{session_id}/chatstate/typing
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "duration": 3000
}
```

| Field | Description |
|-------|-------------|
| `to` | Recipient JID |
| `duration` | Duration in milliseconds |

---

# Blocking

Manage blocked contacts.

## Get Block List

Get all blocked contacts.

```
GET /api/v1/sessions/{session_id}/blocking/list
```

### Response

```json
{
  "blocked": [
    "628123456789@s.whatsapp.net",
    "628987654321@s.whatsapp.net"
  ],
  "count": 2
}
```

---

## Block Contact

Block a contact.

```
POST /api/v1/sessions/{session_id}/blocking/block
```

### Request Body

```json
{
  "jid": "628123456789@s.whatsapp.net"
}
```

---

## Unblock Contact

Unblock a contact.

```
POST /api/v1/sessions/{session_id}/blocking/unblock
```

### Request Body

```json
{
  "jid": "628123456789@s.whatsapp.net"
}
```

---

## Check Block Status

Check if a contact is blocked.

```
GET /api/v1/sessions/{session_id}/blocking/check/{jid}
```

### Response

```json
{
  "jid": "628123456789@s.whatsapp.net",
  "blocked": true
}
```
