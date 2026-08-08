---
sidebar_position: 11
---

# Labels & Quick Replies

App State Sync (`syncd`, `regular` collection) — labels, quick replies and account settings (`whatsapp-rust 5e084b9b` `feat(appstate): #1250`).

## Labels

Labels are created/edited via `label_edit` (`["label_edit", labelId]`) and associations via `label_jid` / `label_message`.

### Create Label

```
POST /api/v1/sessions/{session_id}/labels
```

```json
{
  "label_id": "my-label-id",
  "name": "My Label",
  "color_id": 5
}
```

`color_id` 0–19 matches WA Web palette. Upsert — same call renames/recolors.

### Delete Label

```
DELETE /api/v1/sessions/{session_id}/labels/{label_id}
```

### Add / Remove Chat Label

```
POST   /api/v1/sessions/{session_id}/labels/{label_id}/chats/{chat_jid}
DELETE /api/v1/sessions/{session_id}/labels/{label_id}/chats/{chat_jid}
```

Example:

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/labels/label-1/chats/5599@s.whatsapp.net \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Add / Remove Message Label

```
POST /api/v1/sessions/{session_id}/labels/{label_id}/messages
POST /api/v1/sessions/{session_id}/labels/{label_id}/messages/remove
```

Request body:

```json
{
  "chat_jid": "5599@s.whatsapp.net",
  "message_id": "ABCD1234"
}
```

---

## Quick Replies

Business canned responses (`quick_reply` `["quick_reply", id]`).

### Upsert Quick Reply

```
PUT /api/v1/sessions/{session_id}/quick-replies
```

```json
{
  "id": "qr-id-1",
  "shortcut": "/hello",
  "message": "Hello! How can I help?",
  "keywords": ["hi", "hello"],
  "count": 0
}
```

`count` is a usage counter (0 for new). Mirrors `WAWebQuickRepliesSync`.

### Delete Quick Reply

```
DELETE /api/v1/sessions/{session_id}/quick-replies/{id}
```

---

## Link Previews Setting

Account-level `setting_disableLinkPreviews` (`["setting_disableLinkPreviews"]`).

```
POST /api/v1/sessions/{session_id}/settings/link-previews
```

```json
{ "disabled": true }
```

Replicated to linked devices via App State. Does not block explicitly-requested previews.
