---
sidebar_position: 17
description: Change the linked WhatsApp account's own name, About text and profile picture.
keywords:
  - update profile
  - profile picture
  - push name
  - about
---

# Profile

Edit the profile of the account a WhatsApp Web session is linked to. These endpoints need a connected `whatsapp_web` session; a Cloud API or offline session answers with the usual not-connected error.

## Update Profile

Change any of the display name, the About text and the picture in one call. At least one field is required, and fields you leave out are not touched. Everything is validated before anything is sent, so a bad picture does not leave the name half-changed.

```
PUT /api/v1/sessions/{session_id}/profile
```

### Request Body

```json
{
  "name": "Acme Support",
  "about": "Open 09:00-17:00 WIB",
  "about_emoji": "🕒",
  "picture": { "url": "https://example.com/logo.png" }
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Display name (push name), 1 to 25 characters after trimming |
| `about` | string | About text, up to 139 characters. An empty string clears it. It is sent the way WhatsApp Web sends it, with no expiry, so the phone app shows it |
| `about_emoji` | string | Emoji shown with the About text, up to 8 characters. Needs `about`; ignored when `about` is empty |
| `picture` | object | `{"url": "..."}` or `{"data": "<base64>", "mimetype": "image/png"}`. Any common image format is accepted; it is centre-cropped to a square and re-encoded as a 640x640 JPEG |

### Response

```json
{
  "success": true,
  "message": "Updated name, about, picture"
}
```

### Errors

| Status | When |
|--------|------|
| 400 | No field given, name or About out of range, or the picture cannot be decoded |
| 404 | Session not found |
| 503 | Session is not connected |

## Remove Profile Picture

```
DELETE /api/v1/sessions/{session_id}/profile/picture
```

### Response

```json
{
  "success": true,
  "message": "Profile picture removed"
}
```
