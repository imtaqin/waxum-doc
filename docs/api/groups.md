---
sidebar_position: 4
description: List, create, and manage WhatsApp groups -- participants, admins, subject, description, settings, and invite links.
keywords:
  - groups
  - participants
  - admin
  - invite link
  - group settings
---

# Groups

Manage and interact with WhatsApp groups.

## List Groups

Get all groups the session is part of.

```
GET /api/v1/sessions/{session_id}/groups
```

### Response

```json
{
  "groups": [
    {
      "jid": "123456789-1234567890@g.us",
      "name": "My Group",
      "participant_count": 25
    }
  ],
  "total": 1
}
```

---

## Get Group

Get basic group information.

```
GET /api/v1/sessions/{session_id}/groups/{group_jid}
```

### Response

```json
{
  "jid": "123456789-1234567890@g.us",
  "name": "My Group",
  "topic": "Group description",
  "participant_count": 25,
  "created_at": 1640000000
}
```

---

## Get Group Info

Get detailed group information including participants.

```
GET /api/v1/sessions/{session_id}/groups/{group_jid}/info
```

### Response

```json
{
  "jid": "123456789-1234567890@g.us",
  "name": "My Group",
  "topic": "Group description",
  "owner": "628123456789@s.whatsapp.net",
  "created_at": 1640000000,
  "participants": [
    {
      "jid": "628123456789@s.whatsapp.net",
      "role": "admin"
    },
    {
      "jid": "628987654321@s.whatsapp.net",
      "role": "member"
    }
  ]
}
```

### Participant Roles

| Role | Description |
|------|-------------|
| `superadmin` | Group creator |
| `admin` | Group admin |
| `member` | Regular member |

---

## Create Group

Create a new WhatsApp group.

```
POST /api/v1/sessions/{session_id}/groups
```

### Request Body

```json
{
  "name": "My New Group",
  "participants": [
    "628123456789@s.whatsapp.net",
    "628987654321@s.whatsapp.net"
  ],
  "membership_approval_mode": "off",
  "member_add_mode": "all_member_add",
  "member_link_mode": "admin_link"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Group name |
| `participants` | array | Yes | List of participant JIDs |
| `membership_approval_mode` | string | No | `off` or `on` (join request approval) |
| `member_add_mode` | string | No | `admin_add` or `all_member_add` |
| `member_link_mode` | string | No | `admin_link` or `all_member_link` |

### Response

```json
{
  "group_jid": "123456789-1234567890@g.us"
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/groups \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My New Group",
    "participants": ["628123456789@s.whatsapp.net"]
  }'
```

---

## Set Group Subject

Update the group name/subject.

```
PUT /api/v1/sessions/{session_id}/groups/{group_jid}/subject
```

### Request Body

```json
{
  "subject": "New Group Name"
}
```

### Response

```json
{
  "success": true
}
```

---

## Set Group Description

Update or delete the group description.

```
PUT /api/v1/sessions/{session_id}/groups/{group_jid}/description
```

### Request Body

```json
{
  "description": "This is the group description",
  "prev_id": null
}
```

To delete the description, set `description` to `null`.

### Response

```json
{
  "success": true
}
```

---

## Set Group Settings

Update advanced group settings.

```
PUT /api/v1/sessions/{session_id}/groups/{group_jid}/settings
```

### Request Body

```json
{
  "membership_approval_mode": "on",
  "member_add_mode": "admin_add",
  "member_link_mode": "admin_link"
}
```

All fields are optional. Only provided fields will be updated.

| Field | Type | Values | Description |
|-------|------|--------|-------------|
| `membership_approval_mode` | string | `off`, `on` | Whether join requests require admin approval |
| `member_add_mode` | string | `admin_add`, `all_member_add` | Who can add new participants |
| `member_link_mode` | string | `admin_link`, `all_member_link` | Who can edit the group invite link |

### Response

```json
{
  "success": true
}
```

### Example

```bash
curl -X PUT http://localhost:3451/api/v1/sessions/my-session/groups/123456789-1234567890@g.us/settings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "membership_approval_mode": "on",
    "member_add_mode": "admin_add"
  }'
```

---

## Leave Group

Leave a group.

```
POST /api/v1/sessions/{session_id}/groups/{group_jid}/leave
```

### Response

```json
{
  "success": true
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/groups/123456789-1234567890@g.us/leave \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Add Participants

Add members to a group.

```
POST /api/v1/sessions/{session_id}/groups/{group_jid}/participants
```

### Request Body

```json
{
  "participants": [
    "628123456789@s.whatsapp.net",
    "628987654321@s.whatsapp.net"
  ]
}
```

### Response

```json
{
  "results": [
    {
      "jid": "628123456789@s.whatsapp.net",
      "status": "Added"
    }
  ]
}
```

---

## Remove Participants

Remove members from a group.

```
DELETE /api/v1/sessions/{session_id}/groups/{group_jid}/participants
```

### Request Body

```json
{
  "participants": [
    "628123456789@s.whatsapp.net"
  ]
}
```

### Response

```json
{
  "results": [
    {
      "jid": "628123456789@s.whatsapp.net",
      "status": "Removed"
    }
  ]
}
```

---

## Promote Participants

Make members group admins.

```
POST /api/v1/sessions/{session_id}/groups/{group_jid}/admins
```

### Request Body

```json
{
  "participants": [
    "628123456789@s.whatsapp.net"
  ]
}
```

### Response

```json
{
  "success": true
}
```

---

## Demote Participants

Remove admin status from members.

```
DELETE /api/v1/sessions/{session_id}/groups/{group_jid}/admins
```

### Request Body

```json
{
  "participants": [
    "628123456789@s.whatsapp.net"
  ]
}
```

### Response

```json
{
  "success": true
}
```

---

## Get Invite Link

Get or reset the group invite link.

```
GET /api/v1/sessions/{session_id}/groups/{group_jid}/invite-link
```

### Query Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `reset` | boolean | Set to `true` to generate a new invite link |

### Response

```json
{
  "invite_link": "https://chat.whatsapp.com/AbCdEfGhIjK"
}
```

### Example

```bash
# Get current invite link
curl http://localhost:3451/api/v1/sessions/my-session/groups/123456789-1234567890@g.us/invite-link \
  -H "Authorization: Bearer YOUR_TOKEN"

# Reset and get new invite link
curl "http://localhost:3451/api/v1/sessions/my-session/groups/123456789-1234567890@g.us/invite-link?reset=true" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Sending Messages to Groups

Use the same message endpoints with group JID:

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "123456789-1234567890@g.us",
    "text": "Hello group!"
  }'
```
