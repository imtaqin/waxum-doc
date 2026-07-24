---
sidebar_position: 13
---

# Scheduled Send

Park a message now, dispatch it later. Added in v0.8.0.

Every send endpoint under `/messages/*` (all ~34 of them — text,
image, video, audio, document, sticker, location, contact, poll,
buttons, list, interactive, cta-url, quick-reply, newsletter invites,
order, invoice, payment flows, comment, scheduled-call, ...) accepts
an optional `send_at` field alongside its normal body:

```json
{
  "to": "628123456789",
  "text": "Reminder: your appointment is tomorrow at 10am",
  "send_at": "2026-08-01T09:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `send_at` | string (ISO-8601 UTC) | No | When to send. Omit or leave in the past/near-future to send immediately |

## Immediate vs. parked

Every send endpoint now returns a **unified response shape** that
distinguishes the two outcomes:

- **No `send_at`, or `send_at` within ~2 seconds of now** — sends
  immediately through the normal send path. Response:

  ```json
  {
    "status": "sent",
    "message_id": "3EB0C8F1A2B3C4D5E6",
    "timestamp": 1700000000,
    "to": "628123456789@s.whatsapp.net"
  }
  ```

- **`send_at` more than ~2 seconds in the future** — the request body
  is stored in the `scheduled_messages` table instead of being sent,
  and the endpoint answers right away:

  ```json
  {
    "status": "pending",
    "schedule_id": "b3f1c2a4-1234-4cde-9f00-abcdef123456",
    "send_at": "2026-08-01T09:00:00Z"
  }
  ```

The ~2 second grace window exists so a `send_at` that is technically
in the future (clock skew, request latency) doesn't round-trip through
the scheduler table for no reason — it just sends right away.

## Dispatch

A background loop polls for due rows (period from `SCHEDULER_POLL_MS`,
default `1000` ms), claims each one (`pending` → `sending`, so a
concurrent cancel or a second poller instance can't double-send it),
and replays the stored request body through the same `execute_*` send
core the immediate path uses. The row is then settled as `sent` (with
the resulting `message_id`) or `failed` (with the error), and a
`scheduled_sent` / `scheduled_failed` webhook event fires either way.

Up to 50 due rows are claimed and dispatched per tick.

## List Session Scheduled Messages

```
GET /api/v1/sessions/{session_id}/scheduled
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter to one status: `pending`, `sending`, `sent`, `failed`, `cancelled` |

### Response

```json
{
  "messages": [
    {
      "id": "b3f1c2a4-1234-4cde-9f00-abcdef123456",
      "session_id": "main",
      "endpoint": "text",
      "send_at": "2026-08-01T09:00:00Z",
      "status": "pending",
      "error": null,
      "message_id": null,
      "created_at": "2025-12-31T10:00:00Z",
      "updated_at": "2025-12-31T10:00:00Z"
    }
  ],
  "count": 1
}
```

`endpoint` is the internal send-endpoint key the body will be
dispatched to (`text`, `image`, `cta-url`, ...), not a full path.
`error` is only set once `status` is `failed`; `message_id` is only
set once `status` is `sent`.

## Cancel Scheduled Message

Cancels a message that hasn't fired yet.

```
DELETE /api/v1/sessions/{session_id}/scheduled/{id}
```

### Response

Same `ScheduledMessage` shape as the list endpoint, with `status`
`cancelled`.

Returns `400` if the message is no longer `pending` (already sent,
failed, or cancelled) — only pending messages can be cancelled. If the
scheduler claims the row for dispatch in the same instant as the
cancel request, the cancel loses the race and also returns `400`;
retrying is safe.

## List All Scheduled Messages (fleet-wide)

```
GET /api/v1/scheduled
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session` | string | No | Restrict to this session id |
| `status` | string | No | Filter to one status |

### Response

Same shape as [List Session Scheduled Messages](#list-session-scheduled-messages).

:::note Interaction with blast
[Blast](./blast.md) recipients never go through the scheduler: the
worker forces `send_at` to `null` on every recipient body before
dispatch, even if the original blast request had a top-level
`send_at` (that field controls only when the *job* starts, not
per-recipient scheduling).
:::
