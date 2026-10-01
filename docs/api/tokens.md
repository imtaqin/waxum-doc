---
sidebar_position: 15
description: Mint, list, and revoke bearer tokens scoped to specific WhatsApp sessions for secure multi-tenant API access.
keywords:
  - API tokens
  - scoped tokens
  - multi-tenant
  - bearer token
---

# Tokens

Mint, list, and revoke bearer tokens scoped to a specific set of sessions.
Fleet-wide (mint/list/revoke require the instance's `SUPERADMIN_TOKEN`, or
an unscoped superadmin JWT — a minted token cannot mint, list, or revoke
other tokens).

Every waxum instance already accepts `SUPERADMIN_TOKEN` (or an unscoped
JWT), which can read/send/delete on every session on the instance. These
endpoints are for the common multi-tenant case: hand a specific app or
customer a credential that can only touch *their* session(s), and pull
it back later without rotating the instance-wide secret.

## Mint Token

```
POST /api/v1/tokens
```

### Request Body

```json
{
  "name": "customer-mobile-app",
  "session_ids": ["my-session"],
  "expires_in_hours": 720
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | No | Human-readable label, shown in `GET /tokens`. Not security-relevant. |
| `session_ids` | string[] | One of the two | Sessions this token may access. Each must already exist. |
| `session_prefixes` | string[] | One of the two | Session-id prefixes this token may use, e.g. `["rq-mkt-"]`. See [Prefix tokens](#prefix-tokens). |
| `expires_in_hours` | integer | No | Token lifetime. Defaults to 720 (30 days). |

### Response

```json
{
  "id": "b6b3f8b0-...",
  "token": "eyJhbGciOi...",
  "name": "customer-mobile-app",
  "session_ids": ["my-session"],
  "session_prefixes": [],
  "expires_at": 1789123456
}
```

`token` is the bearer value — store it now. It is never returned again;
`GET /tokens` only shows metadata. `id` is the token's identifier, used to
revoke it later.

A token minted here behaves like the instance's `SUPERADMIN_TOKEN` for
every endpoint under its bound `session_ids` — same `Authorization: Bearer
<token>` header — but a request to any *other* session, or to a fleet-wide
endpoint (`POST /sessions/purge`, `POST /tokens`, etc.), gets
`403 Forbidden`. `GET /sessions` is allowed and returns only the sessions
the token can reach. It also cannot log into the console — the console is
a full-fleet admin UI, and a scoped token is deliberately not a superadmin
credential in that sense.

`404` if any `session_id` in the request doesn't exist on this instance;
`400` if both `session_ids` and `session_prefixes` are empty, or a prefix
is invalid.

### Prefix tokens

*Since v0.13.4.* A token bound to `session_ids` can only reach sessions
that already exist. `session_prefixes` instead hands out a namespace: the
token reaches every session whose id starts with one of its prefixes,
including sessions created later.

```json
{
  "name": "marketing-service",
  "session_prefixes": ["rq-mkt-"],
  "expires_in_hours": 720
}
```

With that token a service can, on its own:

| Request | Result |
|---------|--------|
| `POST /sessions` with `"id": "rq-mkt-jakarta"` | Creates the session |
| `POST /sessions` with `"id": "billing-1"` | `403`, the id is outside the prefix |
| `GET /sessions` | Lists only `rq-mkt-*` sessions |
| Anything under `/sessions/rq-mkt-jakarta/...` | Allowed, including `DELETE` |
| Anything under `/sessions/billing-1/...` | `403` |
| `POST /sessions/purge`, `/disconnect-all`, `/reconnect-all`, `/tokens` | `403`, still superadmin-only |

A prefix needs at least 3 characters from `A-Z a-z 0-9 - _`, so a prefix
can never widen a token to every session. `session_ids` and
`session_prefixes` can be combined in one token. Only a token that has
prefixes may call `POST /sessions`.

## List Tokens

```
GET /api/v1/tokens
```

### Response

```json
{
  "tokens": [
    {
      "id": "b6b3f8b0-...",
      "name": "customer-mobile-app",
      "session_ids": ["my-session"],
      "session_prefixes": [],
      "created_at": "2026-07-28 10:00:00",
      "expires_at": "2026-08-27 10:00:00",
      "revoked": false
    }
  ],
  "count": 1
}
```

Never includes the bearer value — only `POST /tokens`'s response does,
once, at mint time.

## Revoke Token

```
POST /api/v1/tokens/{id}/revoke
```

Immediately invalidates the token — every request against it starts
returning `403` right away, not just after its `expires_in_hours` lapses.
Use the `id` from the mint response or `GET /tokens`, not the bearer value
itself.

`404` if the id doesn't exist or was already revoked.

## How scoping is enforced

A minted token's JWT carries only an opaque `jti` (token id) — the actual
session bindings and revocation status live server-side in waxum's own
database, looked up on every request. This is why revoking a token takes
effect immediately (no need to wait for the JWT to expire) and why binding
changes don't require reissuing the token itself.

If you don't need per-app isolation — every caller can be trusted with
every session on the instance — the plain `SUPERADMIN_TOKEN` remains the
simplest option; these endpoints are additive; nothing about existing
`SUPERADMIN_TOKEN`/unscoped-JWT behavior changes.
