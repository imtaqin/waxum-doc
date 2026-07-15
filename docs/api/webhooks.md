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

### Message Event

```json
{
  "session_id": "my-session",
  "event": "message",
  "timestamp": 1767143203,
  "data": {
    "from": "628123456789@s.whatsapp.net",
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

---

## Signature Verification

If you provide a `secret`, Waxum will sign the payload with HMAC-SHA256.

The signature is sent in the `X-Webhook-Signature` header:

```
X-Webhook-Signature: sha256=abc123...
```

### Verification Example (Node.js)

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express middleware
app.post('/webhook', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = JSON.stringify(req.body);

  if (!verifySignature(payload, signature, 'your-secret')) {
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

def verify_signature(payload, signature, secret):
    expected = 'sha256=' + hmac.new(
        secret.encode(),
        payload.encode(),
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
