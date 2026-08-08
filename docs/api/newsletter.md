---
sidebar_position: 10
---

# Newsletter

Channel (newsletter) admin and follower operations — expanded in `whatsapp-rust 5e084b9b` (`feat(newsletter): #1249`). Previously only invite/forward was exposed via `/messages/*`; full lifecycle is now under `/newsletters/*`.

Base: `/api/v1/sessions/{session_id}/newsletters`

## List Subscribed

```
GET /api/v1/sessions/{session_id}/newsletters/subscribed
```

Returns newsletters the session is subscribed to (`client.newsletter().list_subscribed()`).

```bash
curl http://localhost:3451/api/v1/sessions/my-session/newsletters/subscribed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Get Metadata

```
GET /api/v1/sessions/{session_id}/newsletters/{jid}/metadata
```

`jid` is the newsletter JID (`1203…@newsletter`).

```bash
curl http://localhost:3451/api/v1/sessions/my-session/newsletters/120363000000000000@newsletter/metadata \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Create

```
POST /api/v1/sessions/{session_id}/newsletters
```

### Request Body

```json
{
  "name": "My Channel",
  "description": "Optional",
  "picture_b64": null
}
```

## Join / Leave

```
POST /api/v1/sessions/{session_id}/newsletters/{jid}/join
POST /api/v1/sessions/{session_id}/newsletters/{jid}/leave
```

## Delete

```
DELETE /api/v1/sessions/{session_id}/newsletters/{jid}
```

## Change Owner / Demote Admin

```
POST /api/v1/sessions/{session_id}/newsletters/{jid}/change-owner
POST /api/v1/sessions/{session_id}/newsletters/{jid}/demote
```

### Request Body

```json
{ "user": "559999999999@s.whatsapp.net" }
```

## Admin Info

```
GET /api/v1/sessions/{session_id}/newsletters/{jid}/admin-info
```

## Followers

```
GET /api/v1/sessions/{session_id}/newsletters/{jid}/followers?limit=50
```

`limit` caps returned array (server side `get_followers(jid, count)`).

## Mute

```
POST /api/v1/sessions/{session_id}/newsletters/{jid}/mute
```

```json
{ "muted": true }
```

Toggles follower mute (`set_follower_mute`).

---

## Legacy: Invite Messages

The invite helpers remain under `/messages/*` for sending invites as chat messages:

- `POST /messages/newsletter-admin-invite`
- `POST /messages/newsletter-follower-invite`
- `POST /messages/newsletter-forward`

These send a *message* with an invite; the endpoints above manage the channel itself.
