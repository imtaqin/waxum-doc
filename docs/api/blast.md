---
sidebar_position: 14
---

# Blast (Bulk Send)

Fan one message payload out to many recipients with pacing, dedup,
retry, and a dead-letter queue. Added in v0.8.0.

A blast job stores one message body plus a list of recipients, then a
single background worker drains the list at a controlled pace,
replaying the same send core used by regular and [scheduled](./scheduled.md)
sends for each recipient.

:::note Single sequential worker, by design
The worker processes exactly one job, one recipient at a time, across
the whole instance. WhatsApp rate-limits and bans aggressive senders,
so running multiple blast workers in parallel would only multiply ban
risk. Pacing comes entirely from each job's `delay_ms` / `jitter_ms`,
not from concurrency.
:::

## Create Blast

```
POST /api/v1/sessions/{session_id}/blast
```

### Request Body

```json
{
  "endpoint": "text",
  "body": {
    "to": "placeholder@s.whatsapp.net",
    "text": "Hello from our monthly newsletter!"
  },
  "recipients": ["628123456789", "628987654321"],
  "delay_ms": 1000,
  "jitter_ms": 250,
  "max_attempts": 3,
  "dedup_across_jobs": false,
  "send_at": "2026-08-01T09:00:00Z"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `endpoint` | string | Yes | Send-endpoint key — same keys used internally by [scheduled send](./scheduled.md#dispatch): `text`, `image`, `cta-url`, etc. |
| `body` | object | Yes | Request payload matching that endpoint's normal request shape. `to` is required for shape validation but is overwritten per recipient at send time; any `send_at` inside it is ignored/forced null |
| `recipients` | array of string | Yes | JIDs or bare phone numbers. Must not be empty |
| `delay_ms` | integer | No | Base pause between sends, ms. Default `1000` |
| `jitter_ms` | integer | No | Extra random `0..=jitter_ms` pause added per send. Default `0` |
| `max_attempts` | integer | No | Send attempts per recipient before it lands in the DLQ. Default `3` |
| `dedup_across_jobs` | boolean | No | Skip recipients any *previous* blast job on this session already delivered to (status `sent`). Default `false` |
| `send_at` | string (ISO-8601 UTC) | No | Delayed job start — the job stays `pending` until this time, then the worker picks it up. Does not use the scheduler table; this is a separate, job-level gate |

Recipients are validated and deduplicated at creation time, before any
row is written:

- Any unparseable recipient fails the whole request with `400` — no
  partial jobs.
- Duplicate entries **within** the `recipients` array are collapsed;
  only the first occurrence is accepted, the rest are recorded as
  `skipped_dup` recipients (visible, not silently dropped).
- If `dedup_across_jobs` is true, recipients already marked `sent` by
  an earlier blast job on the *same session* are also skipped as
  `skipped_dup`.

### Response

```json
{
  "job_id": "b3f1c2a4-1234-4cde-9f00-abcdef123456",
  "total": 1500,
  "skipped_dup": 12,
  "status": "pending"
}
```

`total` is the recipient count actually accepted into the job (after
dedup). `status` is always `pending` at creation — the worker picks it
up on its own schedule.

## Delivery semantics

- **Pacing** — one send at a time, `delay_ms` plus a uniform random
  `0..=jitter_ms` pause between every send. No other throttling.
- **Retry** — a recipient send that fails with attempts remaining goes
  back to `pending` and is retried on a later worker pass, with the
  same per-send delay (no extra backoff — `max_attempts` is the only
  cap).
- **Dead-letter queue** — a recipient send that fails on its *last*
  allowed attempt moves to `dlq` and stays there. It is not
  automatically retried again; only [`/retry`](#retry-blast) requeues
  DLQ recipients.
- **Progress events** — a `blast_progress` webhook event fires every
  25 successful sends, carrying the job's current counters.
- **Completion** — once no `pending` recipients remain, the job closes
  as `completed` (nothing in the DLQ) or `completed_with_failures` (at
  least one DLQ recipient), and a `blast_completed` webhook event
  fires with the final counters.
- **Cancellation is cooperative** — the worker checks the job's status
  before each batch and stops as soon as it's no longer `running`.
  Any recipients not yet processed stay `pending`, so a job can be
  resumed by nothing more than the worker claiming it again (it will
  not resume once `cancelled`, though — see [Cancel Blast](#cancel-blast)).

## List Session Blasts

```
GET /api/v1/sessions/{session_id}/blasts
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter to one status: `pending`, `running`, `completed`, `completed_with_failures`, `cancelled`, `failed` |

### Response

```json
{
  "jobs": [
    {
      "id": "b3f1c2a4-1234-4cde-9f00-abcdef123456",
      "session_id": "main",
      "endpoint": "text",
      "status": "running",
      "options": {
        "delay_ms": 1000,
        "jitter_ms": 250,
        "max_attempts": 3,
        "dedup_across_jobs": false
      },
      "total": 1500,
      "sent_count": 890,
      "failed_count": 4,
      "dlq_count": 2,
      "skipped_dup_count": 12,
      "send_at": null,
      "created_at": "2025-12-31T10:00:00Z",
      "started_at": "2025-12-31T10:00:05Z",
      "finished_at": null
    }
  ],
  "count": 1
}
```

`failed_count` counts every failed attempt including ones that later
succeeded on retry; `dlq_count` is only recipients that exhausted all
attempts.

## Get Blast

Job detail with the same shape as one entry above.

```
GET /api/v1/sessions/{session_id}/blasts/{id}
```

## List Blast Recipients

Paginated per-recipient status.

```
GET /api/v1/sessions/{session_id}/blasts/{id}/recipients
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `status` | string | No | Filter to one status: `pending`, `sending`, `sent`, `failed`, `dlq`, `skipped_dup` |
| `limit` | integer | No | Page size. Default `100`, max `1000` |
| `offset` | integer | No | Rows to skip. Default `0` |

### Response

```json
{
  "recipients": [
    {
      "id": 42,
      "recipient": "628123456789@s.whatsapp.net",
      "status": "sent",
      "attempts": 1,
      "last_error": null,
      "message_id": "3EB0C8F1A2B3C4D5E6",
      "updated_at": "2025-12-31T10:00:12Z"
    }
  ],
  "count": 1
}
```

## Cancel Blast

Stops a job from sending further. Recipients not yet processed remain
`pending` but the worker will not pick them up again once the job is
`cancelled`.

```
POST /api/v1/sessions/{session_id}/blasts/{id}/cancel
```

Returns `400` if the job is already in a terminal state (`completed`,
`completed_with_failures`, `cancelled`, `failed`).

### Response

Same `BlastJob` shape as [Get Blast](#get-blast), with `status`
`cancelled`.

## Retry Blast

Requeues every `dlq` (and `failed`) recipient back to `pending` and
reopens the job so the worker picks it up again.

```
POST /api/v1/sessions/{session_id}/blasts/{id}/retry
```

Returns `400` if the job is still `running` (cancel it first) or if
there is nothing in the DLQ to retry.

### Response

Same `BlastJob` shape as [Get Blast](#get-blast).

## List All Blasts (fleet-wide)

```
GET /api/v1/blasts
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session` | string | No | Restrict to this session id |
| `status` | string | No | Filter to one status |

### Response

Same shape as [List Session Blasts](#list-session-blasts).
