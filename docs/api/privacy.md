---
sidebar_position: 8
description: Read a connected WhatsApp account's privacy settings -- last seen, profile photo, status, and group-add permissions.
keywords:
  - privacy settings
  - last seen
  - profile visibility
---

# Privacy

View privacy settings for a WhatsApp session.

## Get Privacy Settings

Retrieve the current privacy settings for the connected account.

```
GET /api/v1/sessions/{session_id}/privacy/settings
```

### Response

```json
{
  "settings": [
    {
      "category": "last",
      "value": "contacts"
    },
    {
      "category": "online",
      "value": "all"
    },
    {
      "category": "profile",
      "value": "contacts"
    },
    {
      "category": "status",
      "value": "contacts"
    },
    {
      "category": "group_add",
      "value": "contacts"
    },
    {
      "category": "read_receipts",
      "value": "all"
    }
  ]
}
```

### Privacy Categories

| Category | Description |
|----------|-------------|
| `last` | Who can see your last seen time |
| `online` | Who can see when you're online |
| `profile` | Who can see your profile photo |
| `status` | Who can see your status updates |
| `group_add` | Who can add you to groups |
| `read_receipts` | Whether read receipts are enabled |

### Privacy Values

| Value | Description |
|-------|-------------|
| `all` | Everyone |
| `contacts` | My contacts only |
| `none` | Nobody |
| `contact_blacklist` | Contacts except specific people |
| `match_last_seen` | Match last seen setting |

### Example

```bash
curl http://localhost:3451/api/v1/sessions/my-session/privacy/settings \
  -H "Authorization: Bearer YOUR_TOKEN"
```
