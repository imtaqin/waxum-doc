---
sidebar_position: 12
---

# Bots

## List Bots

```
GET /api/v1/sessions/{session_id}/bots
```

Fetches the bot directory (`client.bots().list()` → `GetBotListSpec`, IQ). WhatsApp Web calls this once at session start and every 24h (`bonsai_update_interval`). Every section is returned with presentation metadata (`type`, `display_type`, themes).

```bash
curl http://localhost:3451/api/v1/sessions/my-session/bots \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:

```json
{
  "bots": "...debug..."
}
```

## Capping

```
GET /api/v1/sessions/{session_id}/capping
```

New-chat capping status (`feat(iq): #1251` `CappingStatus` / `NewChatMessageCapping`). Currently returns placeholder; full MEX query (`xwa2_capping`) can be issued via `POST /mex/query` with the `NewChatCapping` doc until typed gateway is wired.

```json
{
  "capping": null,
  "note": "capping query requires mex; use /mex/query with NewChatCapping doc"
}
```
