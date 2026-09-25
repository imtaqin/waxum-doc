---
sidebar_position: 7
description: Upload media to WhatsApp servers for reuse in messages, and download previously received media by its media key.
keywords:
  - media upload
  - media download
  - image
  - video
  - document
---

# Media

Upload and download media files.

## Upload Media

Upload a media file to WhatsApp servers for later use in messages.

```
POST /api/v1/sessions/{session_id}/media/upload
```

### Request

Send as `multipart/form-data`:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | file | Yes | The media file to upload |
| `media_type` | string | No | Type: `image`, `video`, `audio`, `document`, `sticker` |
| `mimetype` | string | No | MIME type (auto-detected if not provided) |

### Response

```json
{
  "url": "https://mmg.whatsapp.net/...",
  "direct_path": "/v/t62.7...",
  "media_key": "base64-encoded-key",
  "file_sha256": "base64-encoded-sha256",
  "file_enc_sha256": "base64-encoded-enc-sha256",
  "file_length": 12345,
  "media_type": "image",
  "mimetype": "image/jpeg"
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/media/upload \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/image.jpg" \
  -F "media_type=image"
```

---

## Download Media

Download and decrypt media from WhatsApp using the media parameters received in a message.

```
POST /api/v1/sessions/{session_id}/media/download
```

### Request Body

```json
{
  "direct_path": "/v/t62.7...",
  "media_key": "base64-encoded-key",
  "file_sha256": "base64-encoded-sha256",
  "file_enc_sha256": "base64-encoded-enc-sha256",
  "file_length": 12345,
  "media_type": "image"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `direct_path` | string | Yes | Media path from message |
| `media_key` | string | Yes | Base64-encoded encryption key |
| `file_sha256` | string | Yes | Base64-encoded file hash |
| `file_enc_sha256` | string | Yes | Base64-encoded encrypted file hash |
| `file_length` | number | Yes | Original file size in bytes |
| `media_type` | string | Yes | Type: `image`, `video`, `audio`, `document`, `sticker` |

### Response

```json
{
  "data": "base64-encoded-file-data",
  "size": 12345
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/media/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "direct_path": "/v/t62.7118-24/...",
    "media_key": "ABC123...",
    "file_sha256": "DEF456...",
    "file_enc_sha256": "GHI789...",
    "file_length": 12345,
    "media_type": "image"
  }'
```

### Usage with Received Messages

When you receive a media message via webhook, extract the media parameters and use them to download:

```javascript
// Example: Handle incoming image message
const mediaMessage = webhookPayload.message.imageMessage;

const downloadParams = {
  direct_path: mediaMessage.directPath,
  media_key: mediaMessage.mediaKey,      // Already base64
  file_sha256: mediaMessage.fileSha256,  // Already base64
  file_enc_sha256: mediaMessage.fileEncSha256,
  file_length: mediaMessage.fileLength,
  media_type: "image"
};

// Download the media
const response = await fetch(`/api/v1/sessions/${sessionId}/media/download`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(downloadParams)
});

const { data, size } = await response.json();
// data is base64-encoded file content
const fileBuffer = Buffer.from(data, 'base64');
```

---

## Media Types

| Type | Description | Common Formats |
|------|-------------|----------------|
| `image` | Photos and images | JPEG, PNG, WebP |
| `video` | Video files | MP4, 3GPP |
| `audio` | Audio files and voice notes | MP3, OGG, WAV |
| `document` | Documents and other files | PDF, DOCX, any |
| `sticker` | Animated or static stickers | WebP |
