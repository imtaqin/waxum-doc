---
sidebar_position: 9
---

# Business

WhatsApp Business catalog, collections and profile — backed by `wacore::iq::business` (IQ `w:biz` `v="3"`) and MEX (`query_catalog`, `query_product_collections`, `biz_query_order`). Synced from `whatsapp-rust 5e084b9b` (`feat(business): #1252`).

## Get Catalog

```
GET /api/v1/sessions/{session_id}/business/catalog?jid={business_jid}&limit=10&after={cursor}&width=100&height=100
```

Fetches one page of a business catalog. Paginate via `after` cursor from `after_cursor`.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `jid` | string | required | Business JID (`5599…@s.whatsapp.net`) |
| `limit` | u32 | 10 | Products per page (`CatalogOptions::limit`) |
| `after` | string | — | Cursor from previous `after_cursor` |
| `width`/`height` | u32 | 100 | Thumbnail edge in px |

### Response

```json
{
  "products": "...debug...",
  "after_cursor": "eyJ...",
  "before_cursor": null
}
```

### Example

```bash
curl "http://localhost:3451/api/v1/sessions/my-session/business/catalog?jid=559999999999@s.whatsapp.net" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Get Collections

```
GET /api/v1/sessions/{session_id}/business/collections?jid={business_jid}&limit=51&item_limit=10&after={cursor}
```

Collections carry products inline. `item_limit` caps products per collection.

### Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `jid` | string | required | Business JID |
| `limit` | u32 | 51 | Collections per page (`collection_limit`) |
| `item_limit` | u32 | 10 | Products per collection |
| `after` | string | — | Forward cursor only (`after_cursor`) |
| `width`/`height` | u32 | 100 | Thumbnail edge |

### Response

```json
{
  "collections": "...debug...",
  "after_cursor": "eyJ..."
}
```

---

## Get Order

```
GET /api/v1/sessions/{session_id}/business/order?jid={business_jid}&order_id={id}&token={token}
```

`order_id` and `token` come from the `OrderMessage` that announced the order. Token is a per-order capability.

### Example

```bash
curl "http://localhost:3451/api/v1/sessions/my-session/business/order?jid=5599@s.whatsapp.net&order_id=ORDER_123&token=TOKEN" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Update Business Profile

```
PATCH /api/v1/sessions/{session_id}/business/profile
```

Delta update — only sent fields are patched. Mirrors `BusinessProfileUpdate`.

### Request Body

```json
{
  "description": "Best coffee in town",
  "email": "hello@bisnis.id",
  "websites": ["https://bisnis.id"],
  "address": "Jl. Sudirman No.1",
  "category": "12"
}
```

| Field | Type | Notes |
|-------|------|-------|
| `description` | string | Bio |
| `email` | string | Contact email |
| `websites` | string[] | Max `BUSINESS_PROFILE_MAX_WEBSITES` (clear with `[]`) |
| `address` | string | Street address |
| `category` | string | Category *id* (directory id, not name) |

### Example

```bash
curl -X PATCH http://localhost:3451/api/v1/sessions/my-session/business/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"description":"Updated via Waxum","websites":["https://baru.id"]}'
```

---

## Remove Cover Photo

```
DELETE /api/v1/sessions/{session_id}/business/cover-photo/{photo_id}
```

`photo_id` is the `fbid` from the cover-photo upload receipt.

```bash
curl -X DELETE http://localhost:3451/api/v1/sessions/my-session/business/cover-photo/123456789 \
  -H "Authorization: Bearer YOUR_TOKEN"
```
