---
sidebar_position: 9
description: Execute raw WhatsApp internal GraphQL (MEX) queries and mutations directly against WhatsApp's Meta Experience API.
keywords:
  - MEX
  - GraphQL
  - WhatsApp internal API
---

# MEX / GraphQL

Execute WhatsApp internal GraphQL queries and mutations via the MEX (Meta Experience) API.

## MEX Query

Execute a GraphQL query against WhatsApp's internal API.

```
POST /api/v1/sessions/{session_id}/mex/query
```

### Request Body

```json
{
  "doc_id": "1234567890",
  "variables": {
    "key": "value"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `doc_id` | string | Yes | GraphQL document ID |
| `variables` | object | Yes | Query variables as JSON |

### Response

```json
{
  "data": {
    "result": "..."
  },
  "errors": null
}
```

On error:

```json
{
  "data": null,
  "errors": [
    {
      "message": "Error description",
      "error_code": 1234,
      "is_retryable": false,
      "severity": "ERROR"
    }
  ]
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/mex/query \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "1234567890",
    "variables": {"input": {"key": "value"}}
  }'
```

---

## MEX Mutate

Execute a GraphQL mutation against WhatsApp's internal API.

```
POST /api/v1/sessions/{session_id}/mex/mutate
```

### Request Body

```json
{
  "doc_id": "9876543210",
  "variables": {
    "input": {
      "key": "value"
    }
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `doc_id` | string | Yes | GraphQL document ID |
| `variables` | object | Yes | Mutation variables as JSON |

### Response

```json
{
  "data": {
    "result": "..."
  },
  "errors": null
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/mex/mutate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "doc_id": "9876543210",
    "variables": {"input": {"key": "value"}}
  }'
```
