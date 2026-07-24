---
sidebar_position: 12
---

# Message Search

Full-text search over stored message history, added in v0.8.0. Two
endpoints: per-session and fleet-wide across every session.

## History ingestion

Search only finds what has been indexed. Every message is captured
best-effort in both directions:

- Incoming messages are indexed from the live event stream as they
  arrive.
- Outgoing messages are indexed right after each send resolves — this
  covers HTTP sends, [scheduled](./scheduled.md) sends, and
  [blast](./blast.md) sends alike, since they all funnel through the
  same send core.

Indexing never blocks or fails a send/receive: a failed insert is
logged and swallowed. Set `MESSAGE_HISTORY_ENABLED=false` to turn
ingestion off entirely — existing rows remain searchable, but nothing
new gets indexed.

:::note Only text is indexed
The searchable body is the message text, or the caption for media
messages. Content-free types (stickers, locations, etc.) have a null
`body` and are not matchable by text.
:::

## Search Session Messages

```
GET /api/v1/sessions/{session_id}/messages/search?q=
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Free-form search text. Empty (after trimming) returns `400` |
| `limit` | integer | No | Page size. Default `20`, max `200` |
| `offset` | integer | No | Rows to skip. Default `0` |

### Response

```json
{
  "messages": [
    {
      "id": 42,
      "message_id": "3EB0C8F1A2B3C4D5E6",
      "session_id": "main",
      "chat_jid": "628123456789@s.whatsapp.net",
      "sender_jid": "628123456789@s.whatsapp.net",
      "direction": "in",
      "msg_type": "text",
      "body": "are we still on for lunch tomorrow?",
      "snippet": "are we still on for <b>lunch</b> tomorrow?",
      "msg_timestamp": "2026-07-21 10:30:00"
    }
  ],
  "count": 1
}
```

Results are newest first. `count` is the number of hits in this page,
not the total match count.

## Search All Messages (fleet-wide)

Same as above but searches across every session on the instance, with
an optional session filter.

```
GET /api/v1/messages/search?q=
```

### Query Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `q` | string | Yes | Free-form search text |
| `session` | string | No | Restrict results to this session id. All sessions when omitted |
| `limit` | integer | No | Page size. Default `20`, max `200` |
| `offset` | integer | No | Rows to skip. Default `0` |

### Response

Same shape as [Search Session Messages](#search-session-messages).

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | integer | Internal row id |
| `message_id` | string | WhatsApp message id |
| `session_id` | string | Session the message belongs to |
| `chat_jid` | string | Chat the message belongs to (DM partner or group JID) |
| `sender_jid` | string | Actual sender; differs from `chat_jid` inside groups. Empty for outgoing messages (the sender is the session's own account and isn't tracked here) |
| `direction` | string | `in` (received) or `out` (sent by this gateway) |
| `msg_type` | string | `text`, `image`, `video`, `audio`, `ptt`, `document`, `sticker`, `location`, `contact`, ... |
| `body` | string \| null | Message body, or caption for media. Null for content-free types |
| `snippet` | string \| null | Highlighted match context — see below |
| `msg_timestamp` | string | `%Y-%m-%d %H:%M:%S` UTC text |

## Backend degrade ladder

Search is implemented per database backend, each with its own
best-effort fallback so a broken or unavailable full-text index never
turns into a hard error — it just degrades to a plainer match:

| Backend | Primary strategy | Snippet support | Fallback (on error) |
|---|---|---|---|
| **SQLite** | FTS5 virtual table (`messages_fts`), external content synced on insert | Yes — `snippet()` with `<b>…</b>` highlights | Plain `LIKE '%…%'` scan |
| **Postgres** | Generated `body_tsv` tsvector column (`simple` config — chats mix languages, so stemming would hurt), GIN index, `plainto_tsquery` | Yes — `ts_headline` | `ILIKE '%…%'` scan |
| **MySQL** | `FULLTEXT` index, `MATCH … AGAINST` in natural language mode | No — snippet is always `null` | `LIKE '%…%'` scan |

`snippet` is therefore only ever populated on SQLite and Postgres, and
only while their primary full-text path is healthy. If either falls
back to its `LIKE`/`ILIKE` path, `snippet` is `null` for that response
even though `body` still contains the match.

:::warning MySQL short-word gotcha
MySQL's default `ft_min_word_len` is 4, so `FULLTEXT` silently drops
shorter tokens from the index — a query for `"hi"` may return nothing
even though matching rows exist. The `LIKE` fallback only triggers on
query **errors**, not on empty result sets, so this isn't
self-correcting. Raise `ft_min_word_len` and rebuild the index if
short-word search matters for your deployment.
:::

:::note SQLite FTS join gotcha (implementation detail)
The SQLite path joins `messages_fts` and `messages`, which both expose
columns with the same names (`message_id`, `session_id`, `body`).
Every column in that query is explicitly qualified (`m.…` / `f.…`) —
an unqualified column fails to prepare with `ambiguous column name`
and silently falls back to the snippet-less `LIKE` path. Not something
a caller needs to do anything about, but explains why a schema change
here needs care.
:::
