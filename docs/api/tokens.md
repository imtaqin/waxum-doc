---
sidebar_position: 15
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
| `session_ids` | string[] | Yes | Sessions this token may access. Must be non-empty. |
| `expires_in_hours` | integer | No | Token lifetime. Defaults to 720 (30 days). |

### Response

```json
{
  "id": "b6b3f8b0-...",
  "token": "eyJhbGciOi...",
  "name": "customer-mobile-app",
  "session_ids": ["my-session"],
  "expires_at": 1789123456
}
```

`token` is the bearer value — store it now. It is never returned again;
`GET /tokens` only shows metadata. `id` is the token's identifier, used to
revoke it later.

A token minted here behaves like the instance's `SUPERADMIN_TOKEN` for
every endpoint under its bound `session_ids` — same `Authorization: Bearer
<token>` header — but a request to any *other* session, or to a fleet-wide
endpoint (`GET /sessions`, `POST /sessions/purge`, `POST /tokens`, etc.),
gets `403 Forbidden`. It also cannot log into the console — the console is
a full-fleet admin UI, and a scoped token is deliberately not a superadmin
credential in that sense.

`404` if any `session_id` in the request doesn't exist on this instance;
`400` if `session_ids` is empty.

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
