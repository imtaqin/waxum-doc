---
sidebar_position: 11
---

# NATS JetStream

Waxum integrates with [NATS JetStream](https://docs.nats.io/nats-concepts/jetstream) for durable event streaming and queue-based outbound messaging. NATS is **optional** — if `NATS_URL` is not set, the API works exactly as before using webhooks only.

## Overview

NATS JetStream provides two capabilities:

1. **Incoming Events** — All WhatsApp events are published to a JetStream stream, allowing external consumers to subscribe and process events with delivery guarantees
2. **Outbound Messages** — External systems can publish message commands to a queue, and Waxum will consume and send them via WhatsApp

```
┌──────────────┐     wa.events.{session}.{type}     ┌──────────────────┐
│   Waxum      │ ─────────────────────────────────► │  Your Consumer   │
│   Gateway    │                                     │  (subscribe)     │
│              │ ◄───────────────────────────────── │                  │
└──────────────┘     wa.send.{session}               │  Your Publisher  │
                                                     └──────────────────┘
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NATS_URL` | *(none)* | NATS server URL. **Required** to enable NATS |
| `NATS_EVENTS_STREAM` | `WA_EVENTS` | Stream name for incoming events |
| `NATS_SEND_STREAM` | `WA_SEND` | Stream name for outbound commands |
| `NATS_EVENTS_MAX_AGE_DAYS` | `7` | Max age for events (days) |
| `NATS_SEND_MAX_AGE_DAYS` | `1` | Max age for outbound commands (days) |
| `NATS_TOKEN` | *(none)* | Optional authentication token |
| `NATS_CREDS_FILE` | *(none)* | Optional NATS credentials file path |

### Docker Compose

The default `docker-compose.yml` includes a NATS server with JetStream enabled:

```yaml
nats:
  image: nats:2.10-alpine
  container_name: wagateway-nats
  command: ["--jetstream", "--store_dir=/data"]
  volumes:
    - nats_data:/data
  ports:
    - "4222:4222"   # Client connections
    - "8222:8222"   # HTTP monitoring
  restart: unless-stopped
```

The API service connects automatically:

```yaml
api:
  environment:
    NATS_URL: nats://nats:4222
```

### Disabling NATS

To run without NATS, simply remove the `NATS_URL` environment variable. The API will function in webhooks-only mode.

---

## Subject Hierarchy

```
wa.events.{session_id}.{event_type}   ← incoming WhatsApp events
wa.send.{session_id}                  ← outbound message commands
```

### Examples

| Subject | Description |
|---------|-------------|
| `wa.events.my-session.message` | New message on session "my-session" |
| `wa.events.my-session.connected` | Session connected |
| `wa.events.my-session.send_result` | Result of an outbound command |
| `wa.events.*.connected` | All sessions' connected events |
| `wa.events.>` | Subscribe to **all** events |
| `wa.send.my-session` | Send a message via "my-session" |

---

## JetStream Streams

| Stream | Subjects | Retention | Max Age | Max Size | Purpose |
|--------|----------|-----------|---------|----------|---------|
| `WA_EVENTS` | `wa.events.>` | Limits | 7 days | 1 GB | Incoming events |
| `WA_SEND` | `wa.send.>` | WorkQueue | 1 day | 512 MB | Outbound commands |

The `WA_SEND` stream uses **WorkQueue** retention — messages are removed after acknowledgment.

---

## Incoming Events

All WhatsApp events that are sent to webhooks are also published to NATS. The payload format is identical to webhook payloads:

```json
{
  "session_id": "my-session",
  "event": "message",
  "timestamp": 1700000000,
  "data": {
    "from": "628123456789@s.whatsapp.net",
    "chat": "628123456789@s.whatsapp.net",
    "message_id": "3EB0ABC123..."
  }
}
```

### Subscribing (NATS CLI)

```bash
# Subscribe to all events
nats sub "wa.events.>"

# Subscribe to messages only
nats sub "wa.events.*.message"

# Subscribe to a specific session
nats sub "wa.events.my-session.>"
```

### Subscribing (Node.js)

```javascript
import { connect, JSONCodec } from 'nats';

const nc = await connect({ servers: 'nats://localhost:4222' });
const js = nc.jetstream();
const jc = JSONCodec();

const sub = await js.subscribe('wa.events.>', {
  durable: 'my-consumer',
  ack_policy: 'explicit',
});

for await (const msg of sub) {
  const event = jc.decode(msg.data);
  console.log(`[${event.event}] ${event.session_id}:`, event.data);
  msg.ack();
}
```

### Subscribing (Python)

```python
import asyncio
import nats

async def main():
    nc = await nats.connect("nats://localhost:4222")
    js = nc.jetstream()

    sub = await js.subscribe("wa.events.>", durable="my-consumer")
    async for msg in sub.messages:
        print(f"Received: {msg.data.decode()}")
        await msg.ack()

asyncio.run(main())
```

---

## Outbound Messages

Publish message commands to `wa.send.{session_id}` and Waxum will consume and send them via WhatsApp.

### Consumer Details

| Property | Value |
|----------|-------|
| Consumer name | `wa-send-worker` |
| Ack policy | Explicit |
| Ack wait | 30 seconds |
| Max retries | 3 |
| Retry delay | 5 seconds (NAK) |

### Command Format

All commands are JSON objects with a `type` field:

```json
{
  "type": "text",
  "to": "628123456789",
  "text": "Hello from NATS!",
  "request_id": "optional-tracking-uuid"
}
```

The `request_id` field is optional. If provided, it will be included in the `send_result` event.

### Supported Message Types

#### Text

```json
{
  "type": "text",
  "to": "628123456789",
  "text": "Hello!",
  "request_id": "uuid"
}
```

#### Image

```json
{
  "type": "image",
  "to": "628123456789",
  "image": { "url": "https://example.com/photo.jpg" },
  "caption": "Check this out",
  "request_id": "uuid"
}
```

#### Video

```json
{
  "type": "video",
  "to": "628123456789",
  "video": { "url": "https://example.com/video.mp4" },
  "caption": "Watch this",
  "request_id": "uuid"
}
```

#### Audio

```json
{
  "type": "audio",
  "to": "628123456789",
  "audio": { "url": "https://example.com/audio.ogg" },
  "ptt": true,
  "request_id": "uuid"
}
```

#### Document

```json
{
  "type": "document",
  "to": "628123456789",
  "document": { "url": "https://example.com/file.pdf" },
  "filename": "report.pdf",
  "caption": "Monthly report",
  "request_id": "uuid"
}
```

#### Sticker

```json
{
  "type": "sticker",
  "to": "628123456789",
  "sticker": { "url": "https://example.com/sticker.webp" },
  "request_id": "uuid"
}
```

#### Location

```json
{
  "type": "location",
  "to": "628123456789",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "name": "Jakarta",
  "address": "DKI Jakarta, Indonesia",
  "request_id": "uuid"
}
```

#### Contact

```json
{
  "type": "contact",
  "to": "628123456789",
  "contact": {
    "display_name": "John Doe",
    "phones": [
      { "number": "+628111222333", "phone_type": "CELL" }
    ]
  },
  "request_id": "uuid"
}
```

#### Reaction

```json
{
  "type": "reaction",
  "to": "628123456789",
  "message_id": "3EB0ABC123...",
  "emoji": "👍",
  "request_id": "uuid"
}
```

#### Poll

```json
{
  "type": "poll",
  "to": "628123456789",
  "name": "Favorite color?",
  "options": ["Red", "Green", "Blue"],
  "selectable_count": 1,
  "request_id": "uuid"
}
```

#### Buttons

```json
{
  "type": "buttons",
  "to": "628123456789",
  "content_text": "Choose an option:",
  "footer": "Tap a button",
  "buttons": [
    { "button_id": "yes", "display_text": "Yes" },
    { "button_id": "no", "display_text": "No" }
  ],
  "header_text": "Confirmation",
  "request_id": "uuid"
}
```

#### List

```json
{
  "type": "list",
  "to": "628123456789",
  "title": "Menu",
  "description": "Choose from the menu:",
  "button_text": "View Menu",
  "sections": [
    {
      "title": "Food",
      "rows": [
        { "row_id": "pizza", "title": "Pizza", "description": "$10" },
        { "row_id": "burger", "title": "Burger", "description": "$8" }
      ]
    }
  ],
  "footer": "Prices include tax",
  "request_id": "uuid"
}
```

#### Interactive

```json
{
  "type": "interactive",
  "to": "628123456789",
  "body_text": "Click a button",
  "footer_text": "Powered by Waxum",
  "buttons": [
    {
      "name": "quick_reply",
      "button_params_json": "{\"display_text\":\"Help\",\"id\":\"help\"}"
    }
  ],
  "request_id": "uuid"
}
```

#### Revoke

```json
{
  "type": "revoke",
  "to": "628123456789",
  "message_id": "3EB0ABC123...",
  "original_sender": "628987654321",
  "request_id": "uuid"
}
```

#### Edit

```json
{
  "type": "edit",
  "to": "628123456789",
  "message_id": "3EB0ABC123...",
  "text": "Updated text",
  "request_id": "uuid"
}
```

#### Read

```json
{
  "type": "read",
  "chat_jid": "628123456789@s.whatsapp.net",
  "sender": "628123456789@s.whatsapp.net",
  "message_ids": ["3EB0ABC123..."],
  "request_id": "uuid"
}
```

### Media Data Formats

For media fields (`image`, `video`, `audio`, `document`, `sticker`), you can use either URL or base64:

```json
// URL
{ "url": "https://example.com/image.jpg" }

// Base64
{ "data": "iVBORw0KGgo...", "mimetype": "image/png" }
```

### Publishing Commands (NATS CLI)

```bash
# Send a text message
nats pub "wa.send.my-session" '{"type":"text","to":"628123456789","text":"Hello from NATS!"}'

# Send an image
nats pub "wa.send.my-session" '{"type":"image","to":"628123456789","image":{"url":"https://example.com/photo.jpg"},"caption":"NATS image"}'
```

---

## Send Results

After processing an outbound command, Waxum publishes a result to `wa.events.{session_id}.send_result`:

```json
{
  "request_id": "uuid",
  "success": true,
  "message_id": "3EB0DEF456...",
  "error": null,
  "timestamp": 1700000000
}
```

On failure:

```json
{
  "request_id": "uuid",
  "success": false,
  "message_id": null,
  "error": "Session error: Client not connected",
  "timestamp": 1700000000
}
```

---

## REST API Endpoints

### Get NATS Status

```
GET /api/v1/nats/status
```

Returns connection status and stream information.

#### Response

```json
{
  "enabled": true,
  "connected": true,
  "url": "nats://localhost:4222",
  "events_stream": {
    "name": "WA_EVENTS",
    "messages": 1234,
    "bytes": 567890,
    "consumer_count": 2,
    "first_seq": 1,
    "last_seq": 1234
  },
  "send_stream": {
    "name": "WA_SEND",
    "messages": 0,
    "bytes": 0,
    "consumer_count": 1,
    "first_seq": 1,
    "last_seq": 56
  }
}
```

When NATS is disabled:

```json
{
  "enabled": false,
  "connected": false,
  "url": null,
  "events_stream": null,
  "send_stream": null
}
```

---

### Purge Stream

```
POST /api/v1/nats/streams/{stream_name}/purge
```

Remove all messages from a stream.

| Parameter | Type | Description |
|-----------|------|-------------|
| `stream_name` | path | Stream name (`WA_EVENTS` or `WA_SEND`) |

#### Response

```json
{
  "success": true,
  "message": "Stream 'WA_EVENTS' purged"
}
```

---

### List Consumers

```
GET /api/v1/nats/streams/{stream_name}/consumers
```

Get consumer count for a stream.

| Parameter | Type | Description |
|-----------|------|-------------|
| `stream_name` | path | Stream name (`WA_EVENTS` or `WA_SEND`) |

#### Response

```json
{
  "success": true,
  "stream": "WA_EVENTS",
  "consumer_count": 2
}
```

---

## Error Handling

| Scenario | Behavior |
|----------|----------|
| `NATS_URL` not set | NATS disabled entirely, webhooks-only mode |
| NATS unreachable at startup | Log warning, continue without NATS |
| NATS publish fails (incoming) | Log warning, does not block webhooks |
| Outbound command parse fails | NAK, retry up to 3x, then dropped |
| Session not connected (outbound) | NAK with 5s delay for retry |
| WhatsApp send fails (outbound) | NAK with 5s delay for retry |

---

## Monitoring

### NATS HTTP Monitoring

If port 8222 is exposed, you can monitor NATS at:

```
http://localhost:8222/varz      # Server info
http://localhost:8222/jsz       # JetStream info
http://localhost:8222/connz     # Connections
```

### NATS CLI

```bash
# Check server status
nats server info

# List streams
nats stream ls

# Stream details
nats stream info WA_EVENTS
nats stream info WA_SEND

# Consumer details
nats consumer info WA_SEND wa-send-worker

# Watch events in real-time
nats sub "wa.events.>" --last=10
```
