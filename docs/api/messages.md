---
sidebar_position: 2
---

# Messages

Send various types of messages through WhatsApp.

## LID auto-resolve {#lid-auto-resolve}

WhatsApp migrated most consumer contacts to **LID-only** privacy
addressing. Sending to a legacy `phone@s.whatsapp.net` JID for a
LID-only contact is accepted by the WA edge **but silently dropped** —
no error, no delivery.

Every `/messages/*` endpoint in waxum runs the `to` field through
`resolve_recipient_jid`:

| `to` shape | What happens |
|---|---|
| `628123456789` (plain phone) | Parsed as `@s.whatsapp.net`, then a `usync` lookup translates it to the contact's `@lid` form when one exists. |
| `628123456789@s.whatsapp.net` | Same translation as above. |
| `12300954140784@lid` | Pass-through, no lookup. |
| `120363...@g.us` / `...@broadcast` | Pass-through. |

The translation is cached inside the upstream lib, so only the
**first** send per contact pays the usync roundtrip (~50–200 ms);
subsequent sends reuse the resolved LID. The response shows the JID
that was actually used:

```json
{
  "message_id": "3EB0...",
  "timestamp": 1781065817,
  "to": "20045283487834@lid"
}
```

::: tip Always send the resolved JID back to clients
Once you receive the `to` field with `@lid` in the response, persist it
on the contact record. Subsequent sends become a single hop again on
the waxum side too.
:::

## Send Text Message

```
POST /api/v1/sessions/{session_id}/messages/text
```

### Request Body

```json
{
  "to": "628123456789",
  "text": "Hello from Waxum!"
}
```

### Response

```json
{
  "message_id": "3EB0ABC123...",
  "timestamp": 1700000000,
  "to": "628123456789@s.whatsapp.net"
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "text": "Hello!"
  }'
```

---

## Fake Reply (Anti-Ban)

Wrap an outgoing text message as a "reply" to a synthesized dummy message so recipients see it in reply-style UI. Useful for blast campaigns to make messages look like conversational replies and reduce spam flagging.

Add the `fake_reply` field to any **Send Text** request body:

```
POST /api/v1/sessions/{session_id}/messages/text
```

### Request Body

```json
{
  "to": "628123456789",
  "text": "Ini promo bulan ini!",
  "fake_reply": {
    "type": "product",
    "title": "Laptop Gaming ASUS ROG",
    "body": "Rp 15.000.000"
  }
}
```

### Fake Reply Types

| Type | Description | Auto-populated fields |
|---|---|---|
| `text` | Reply to a dummy text question | Random short question from pool |
| `product` | Reply to a fake marketplace product listing | Product name, price, store |
| `order` | Reply to a fake order notification | Order ID, item, quantity, total |
| `location` | Reply to a fake location pin (Indonesian malls/landmarks) | Lat/long with small jitter |
| `video` | Reply to a fake video message | Video title, caption |
| `document` | Reply to a fake PDF document | Filename, caption |
| `contact` | Reply to a fake vCard contact | Name, phone, vCard block |

All fields inside `fake_reply` are optional except `type`:

| Field | Type | Default |
|---|---|---|
| `type` | string | **required** — one of the types above |
| `title` | string | Auto-generated from type-specific pool |
| `body` | string | Auto-generated from type-specific pool |
| `participant` | string | Random JID (`62xxxxxxxxxx@s.whatsapp.net`) |
| `stanza_id` | string | Random 16-byte hex stanza ID |

Indonesian data pools are bundled — product names (Samsung, ASUS, Xiaomi...), locations (Grand Indonesia, Plaza Senayan with real lat/long), mall-appropriate prices (Rp 15jt - 999jt), etc.

### Example — Product reply style

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "text": "Pesan Anda sudah kami proses ya kak",
    "fake_reply": {
      "type": "order",
      "title": "Invoice #INV-2026-0042",
      "body": "Total: Rp 1.250.000"
    }
  }'
```

### Example — Location reply (auto-generated)

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/text \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "text": "Ya pak, lokasi kami di sini",
    "fake_reply": { "type": "location" }
  }'
```

The recipient sees the message as a quoted reply to a fake pin (random Jakarta mall with real coordinates), making conversational context look natural.

### Notes

- `fake_reply` takes **precedence** over `reply_to`. If both are set, `fake_reply` wins.
- The quoted "original" message is never sent to anyone — it's only embedded in the outgoing message's `ContextInfo.QuotedMessage` protobuf field, which WhatsApp clients render as a reply.
- Currently supported on `messages/text` only. Extension to image/video/document payloads is planned.

---

## Send Image

```
POST /api/v1/sessions/{session_id}/messages/image
```

### Request Body

```json
{
  "to": "628123456789",
  "image": {
    "url": "https://example.com/image.jpg"
  },
  "caption": "Check this out!"
}
```

Or with base64:

```json
{
  "to": "628123456789",
  "image": {
    "data": "/9j/4AAQSkZJRg...",
    "mimetype": "image/jpeg"
  },
  "caption": "Check this out!"
}
```

---

## Send Video

```
POST /api/v1/sessions/{session_id}/messages/video
```

### Request Body

```json
{
  "to": "628123456789",
  "video": {
    "url": "https://example.com/video.mp4"
  },
  "caption": "Watch this!"
}
```

---

## Send Audio

```
POST /api/v1/sessions/{session_id}/messages/audio
```

### Request Body

```json
{
  "to": "628123456789",
  "audio": {
    "url": "https://example.com/audio.mp3"
  },
  "ptt": true
}
```

| Field | Description |
|-------|-------------|
| `ptt` | Push-to-talk (voice note) if true |

---

## Send Document

```
POST /api/v1/sessions/{session_id}/messages/document
```

### Request Body

```json
{
  "to": "628123456789",
  "document": {
    "url": "https://example.com/document.pdf"
  },
  "filename": "report.pdf"
}
```

---

## Send Sticker

```
POST /api/v1/sessions/{session_id}/messages/sticker
```

### Request Body

```json
{
  "to": "628123456789",
  "sticker": {
    "url": "https://example.com/sticker.webp"
  }
}
```

---

## Send Location

```
POST /api/v1/sessions/{session_id}/messages/location
```

### Request Body

```json
{
  "to": "628123456789",
  "latitude": -6.2088,
  "longitude": 106.8456,
  "name": "Jakarta",
  "address": "Jakarta, Indonesia"
}
```

---

## Send Contact

```
POST /api/v1/sessions/{session_id}/messages/contact
```

### Request Body

```json
{
  "to": "628123456789",
  "contact": {
    "display_name": "John Doe",
    "phones": [
      {
        "number": "+628123456789",
        "phone_type": "CELL"
      }
    ]
  }
}
```

---

## Send Poll

Create a poll with multiple options.

```
POST /api/v1/sessions/{session_id}/messages/poll
```

### Request Body

```json
{
  "to": "628123456789",
  "name": "What's your favorite color?",
  "options": ["Red", "Blue", "Green", "Yellow"],
  "selectable_count": 1
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `name` | string | Yes | Poll question |
| `options` | array | Yes | List of poll options |
| `selectable_count` | number | No | Max selectable options (0 = unlimited) |
| `reply_to` | string | No | Message ID to reply to |

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/poll \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789",
    "name": "What is your favorite color?",
    "options": ["Red", "Blue", "Green"],
    "selectable_count": 1
  }'
```

---

## Send Buttons

Send a message with interactive buttons.

```
POST /api/v1/sessions/{session_id}/messages/buttons
```

### Request Body

```json
{
  "to": "628123456789",
  "content_text": "Please choose an option",
  "footer": "Powered by Waxum",
  "buttons": [
    {
      "button_id": "btn_1",
      "display_text": "Option 1"
    },
    {
      "button_id": "btn_2",
      "display_text": "Option 2"
    }
  ],
  "header_text": "Main Menu"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `content_text` | string | Yes | Body text |
| `footer` | string | No | Footer text |
| `buttons` | array | Yes | List of buttons (max 3) |
| `header_text` | string | No | Header text |
| `reply_to` | string | No | Message ID to reply to |

---

## Send List

Send a message with a selectable list menu.

```
POST /api/v1/sessions/{session_id}/messages/list
```

### Request Body

```json
{
  "to": "628123456789",
  "title": "Main Menu",
  "description": "Please select an option",
  "button_text": "View Options",
  "sections": [
    {
      "title": "Category 1",
      "rows": [
        {
          "row_id": "row_1",
          "title": "Item 1",
          "description": "Description for item 1"
        },
        {
          "row_id": "row_2",
          "title": "Item 2",
          "description": "Description for item 2"
        }
      ]
    }
  ],
  "footer": "Powered by Waxum"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `title` | string | Yes | List title |
| `description` | string | Yes | Body text |
| `button_text` | string | Yes | Button label to open the list |
| `sections` | array | Yes | List sections with rows |
| `footer` | string | No | Footer text |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Interactive

Send a native flow interactive message.

```
POST /api/v1/sessions/{session_id}/messages/interactive
```

### Request Body

```json
{
  "to": "628123456789",
  "body_text": "Choose an action",
  "footer_text": "Powered by Waxum",
  "buttons": [
    {
      "name": "quick_reply",
      "button_params_json": "{\"display_text\":\"Click Me\",\"id\":\"btn1\"}"
    }
  ],
  "view_once": true,
  "fake_reply": {
    "type": "text",
    "title": "Quoted header",
    "body": "Fake quoted body"
  }
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `body_text` | string | Yes | Body text |
| `footer_text` | string | No | Footer text |
| `buttons` | array | Yes | Native flow button items |
| `reply_to` | string | No | Message ID to reply to |
| `fake_reply` | object | No | Fabricated quoted-message context. Takes priority over `reply_to`. |
| `view_once` | boolean | No | Wrap the interactive payload in `viewOnceMessageV2`. **Defaults to `true`** — this is empirically the only reliable way to keep native-flow `quick_reply` buttons clickable on consumer WhatsApp accounts. Set to `false` only when targeting an account that explicitly handles the raw envelope. |

::: warning Consumer WA Web limitation
`viewOnceMessageV2`-wrapped interactive messages do **not render** in
WhatsApp Web / Desktop — they show as "This message couldn't load.
Open the message on your phone to view it." This is a WA Web
limitation, not a waxum bug. Buttons render and click correctly on the
WhatsApp mobile app.
:::

---

## Send CTA URL Button

Send a single call-to-action URL button. Tapping the button opens the URL in
the user's browser. Built on native-flow so it reaches modern WhatsApp
clients reliably (added in v0.5.0).

```
POST /api/v1/sessions/{session_id}/messages/cta-url
```

### Request Body

```json
{
  "to": "628123456789",
  "body_text": "Check out our latest catalog",
  "footer_text": "Powered by Waxum",
  "display_text": "Open website",
  "url": "https://example.com/catalog",
  "merchant_url": "https://example.com"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `body_text` | string | Yes | Text shown above the button |
| `footer_text` | string | No | Small text below the body |
| `display_text` | string | Yes | Label rendered on the button (e.g. "Open website") |
| `url` | string | Yes | URL the button opens |
| `merchant_url` | string | No | Merchant URL shown in link preview UI on some clients. Falls back to `url` when omitted. |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Quick Reply Buttons

Send 1–3 quick-reply buttons. Modern native-flow replacement for the legacy
`ButtonsMessage` — more reliable across iOS and recent Android WhatsApp
versions (added in v0.5.0).

When the user taps a button, the configured `id` is delivered back via the
`buttons_response` webhook event so you can route the reply.

```
POST /api/v1/sessions/{session_id}/messages/quick-reply
```

### Request Body

```json
{
  "to": "628123456789",
  "body_text": "How can we help?",
  "footer_text": "Reply anytime",
  "buttons": [
    { "id": "support",  "display_text": "Talk to support" },
    { "id": "billing",  "display_text": "Billing question" },
    { "id": "feedback", "display_text": "Leave feedback" }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `body_text` | string | Yes | Text shown above the buttons |
| `footer_text` | string | No | Small text below the body |
| `buttons` | array | Yes | 1–3 quick reply buttons. WA clients clip beyond 3. |
| `buttons[].id` | string | Yes | Internal ID returned to your webhook on tap |
| `buttons[].display_text` | string | Yes | Label rendered on the button |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Newsletter Admin Invite

Send a newsletter admin invitation.

```
POST /api/v1/sessions/{session_id}/messages/newsletter-admin-invite
```

### Request Body

```json
{
  "to": "628123456789",
  "newsletter_jid": "120363000000000000@newsletter",
  "newsletter_name": "My Newsletter",
  "caption": "Join as admin!",
  "invite_expiration": 1700000000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `newsletter_jid` | string | Yes | Newsletter JID |
| `newsletter_name` | string | Yes | Newsletter name |
| `caption` | string | No | Invitation message |
| `invite_expiration` | number | No | Expiration timestamp |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Newsletter Follower Invite

Send a newsletter follower invitation.

```
POST /api/v1/sessions/{session_id}/messages/newsletter-follower-invite
```

### Request Body

```json
{
  "to": "628123456789",
  "newsletter_jid": "120363000000000000@newsletter",
  "newsletter_name": "My Newsletter",
  "caption": "Follow this newsletter!"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `newsletter_jid` | string | Yes | Newsletter JID |
| `newsletter_name` | string | Yes | Newsletter name |
| `caption` | string | No | Invitation message |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Order

Send a business order message.

```
POST /api/v1/sessions/{session_id}/messages/order
```

### Request Body

```json
{
  "to": "628123456789",
  "order_id": "ORD-001",
  "item_count": 3,
  "status": "inquiry",
  "message": "I'd like to order these items",
  "order_title": "My Order",
  "total_amount_1000": 50000000,
  "total_currency_code": "USD"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `order_id` | string | Yes | Order ID |
| `item_count` | number | No | Number of items |
| `status` | string | No | `inquiry`, `accepted`, `declined` |
| `message` | string | No | Order message text |
| `order_title` | string | No | Order title |
| `seller_jid` | string | No | Seller JID |
| `token` | string | No | Order token |
| `total_amount_1000` | number | No | Total amount * 1000 |
| `total_currency_code` | string | No | ISO 4217 currency code |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Invoice

Send a business invoice message.

```
POST /api/v1/sessions/{session_id}/messages/invoice
```

### Request Body

```json
{
  "to": "628123456789",
  "note": "Invoice for services rendered",
  "token": "inv-token-123",
  "attachment_type": "pdf",
  "attachment_mimetype": "application/pdf"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `note` | string | No | Invoice note |
| `token` | string | No | Invoice token |
| `attachment_type` | string | No | `image` or `pdf` |
| `attachment_mimetype` | string | No | MIME type of attachment |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Payment Invite

Send a payment service invitation.

```
POST /api/v1/sessions/{session_id}/messages/payment-invite
```

### Request Body

```json
{
  "to": "628123456789",
  "service_type": 0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `service_type` | number | No | Payment service type (integer) |
| `reply_to` | string | No | Message ID to reply to |

---

## Pin Message

Pin or unpin a message in a chat.

```
POST /api/v1/sessions/{session_id}/messages/pin
```

### Request Body

```json
{
  "chat": "628123456789@s.whatsapp.net",
  "message_id": "3EB0ABC123...",
  "duration_seconds": 86400
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `chat` | string | Yes | Chat JID |
| `message_id` | string | Yes | Message ID to pin |
| `duration_seconds` | number | No | Pin duration (default: 86400) |

### Pin Durations

| Value | Duration |
|-------|----------|
| `0` | Unpin |
| `86400` | 24 hours |
| `604800` | 7 days |
| `2592000` | 30 days |

### Example

```bash
# Pin for 24 hours
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chat": "628123456789@s.whatsapp.net",
    "message_id": "3EB0ABC123...",
    "duration_seconds": 86400
  }'

# Unpin
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/pin \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chat": "628123456789@s.whatsapp.net",
    "message_id": "3EB0ABC123...",
    "duration_seconds": 0
  }'
```

---

## Forward Message

Forward a message to another chat.

```
POST /api/v1/sessions/{session_id}/messages/forward
```

### Request Body

```json
{
  "to": "628987654321@s.whatsapp.net",
  "text": "Forwarded content here"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `text` | string | Yes | Text content to forward |
| `reply_to` | string | No | Message ID to reply to |

---

## Edit Message

```
POST /api/v1/sessions/{session_id}/messages/edit
```

### Request Body

```json
{
  "to": "628123456789",
  "message_id": "3EB0ABC123...",
  "text": "Edited message text"
}
```

---

## Send Reaction

Single endpoint, **CAG-transparent**. The handler auto-swaps between
the plain `ReactionMessage` wire shape (1:1, regular groups) and the
encrypted CAG addon stanza (community-announce groups / channels)
based on the recipient — callers don't pick a path.

```
POST /api/v1/sessions/{session_id}/messages/react
```

### Request Body

```json
{
  "to": "628123456789",
  "message_id": "3EB0ABC123...",
  "emoji": "👍"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID. Plain phone gets auto-resolved to LID (see [LID auto-resolve](#lid-auto-resolve)). |
| `message_id` | string | Yes | ID of the message being reacted to |
| `emoji` | string | Yes | Single emoji. Send `""` to remove the existing reaction. |

To remove reaction, send empty emoji:

```json
{
  "to": "628123456789",
  "message_id": "3EB0ABC123...",
  "emoji": ""
}
```

::: tip Inbound CAG reactions
Incoming encrypted reactions on CAG channels are decrypted by the
upstream lib and surfaced as a regular `reaction` event — no
special-casing needed on the receiver side.
:::

---

## Revoke Message

Delete a message for everyone in the chat.

```
POST /api/v1/sessions/{session_id}/messages/revoke
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "message_id": "3EB0ABC123..."
}
```

To revoke another user's message as a group admin:

```json
{
  "to": "123456789-1234567890@g.us",
  "message_id": "3EB0ABC123...",
  "original_sender": "628987654321@s.whatsapp.net"
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/revoke \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "628123456789@s.whatsapp.net",
    "message_id": "3EB0ABC123..."
  }'
```

---

## Mark as Read

Send read receipts for messages.

```
POST /api/v1/sessions/{session_id}/messages/read
```

### Request Body

```json
{
  "chat_jid": "628123456789@s.whatsapp.net",
  "message_ids": ["3EB0ABC123...", "3EB0DEF456..."]
}
```

For group messages, include the sender:

```json
{
  "chat_jid": "123456789-1234567890@g.us",
  "sender": "628987654321@s.whatsapp.net",
  "message_ids": ["3EB0ABC123..."]
}
```

### Example

```bash
curl -X POST http://localhost:3451/api/v1/sessions/my-session/messages/read \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "chat_jid": "628123456789@s.whatsapp.net",
    "message_ids": ["3EB0ABC123..."]
  }'
```

---

## Send Poll Update (Vote)

Submit a vote on an existing poll.

```
POST /api/v1/sessions/{session_id}/messages/poll-update
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "poll_message_id": "3EB0ABC123...",
  "selected_options": ["sha256-hash-of-option"],
  "enc_iv": "base64-encoded-iv",
  "enc_payload": "base64-encoded-payload"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Chat JID where the poll was created |
| `poll_message_id` | string | Yes | Message ID of the poll |
| `selected_options` | array | Yes | SHA-256 hashes of selected option texts |
| `enc_iv` | string | No | Encryption IV (base64) |
| `enc_payload` | string | No | Encryption payload (base64) |

---

## Send Buttons Response

Send a response to a buttons message.

```
POST /api/v1/sessions/{session_id}/messages/buttons-response
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "selected_button_id": "btn_1",
  "selected_display_text": "Option 1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `selected_button_id` | string | Yes | ID of the selected button |
| `selected_display_text` | string | Yes | Display text of the selected button |
| `reply_to` | string | No | Message ID to reply to |

---

## Send List Response

Send a response to a list message.

```
POST /api/v1/sessions/{session_id}/messages/list-response
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "title": "Category 1",
  "selected_row_id": "row_1",
  "description": "Description for the selection"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `title` | string | Yes | Title of the selection |
| `selected_row_id` | string | Yes | ID of the selected row |
| `description` | string | No | Description of the selection |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Interactive Response

Send a response to a native flow interactive message.

```
POST /api/v1/sessions/{session_id}/messages/interactive-response
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "body_text": "Response body",
  "name": "quick_reply",
  "params_json": "{\"id\":\"btn1\"}",
  "version": 3
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `body_text` | string | No | Response body text |
| `name` | string | Yes | Native flow response name |
| `params_json` | string | Yes | Response parameters (JSON string) |
| `version` | number | No | Native flow version (default: 3) |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Highly Structured Message (HSM)

Send a highly structured message (template).

```
POST /api/v1/sessions/{session_id}/messages/highly-structured
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "namespace": "your_namespace",
  "element_name": "template_name",
  "params": ["param1", "param2"],
  "fallback_lg": "en",
  "fallback_lc": "US"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `namespace` | string | Yes | Template namespace |
| `element_name` | string | Yes | Template element name |
| `params` | array | No | Template parameters |
| `fallback_lg` | string | No | Fallback language |
| `fallback_lc` | string | No | Fallback locale |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Template Button Reply

Send a reply to a template button message.

```
POST /api/v1/sessions/{session_id}/messages/template-button-reply
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "selected_id": "btn_1",
  "selected_display_text": "Option 1",
  "selected_index": 0
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `selected_id` | string | Yes | ID of the selected template button |
| `selected_display_text` | string | Yes | Display text of the selected button |
| `selected_index` | number | No | Index of the selected button |
| `reply_to` | string | No | Message ID to reply to |

---

## Send Comment

Send an encrypted comment on a Community Announcement Group (CAG)
channel post. Wraps the comment body in a top-level `enc_comment_message`
envelope encrypted with the parent post's `messageSecret`, mirroring
WA Web's `WAWebSendCommentMessageAction`.

```
POST /api/v1/sessions/{session_id}/messages/comment
```

### Request Body

```json
{
  "to": "120363000000000000@g.us",
  "text": "This is my comment",
  "target_message_id": "3EB0ABC123...",
  "target_chat_jid": "120363000000000000@g.us",
  "target_participant": "628xxxxxxxxxx@lid"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Channel / community-announce group JID where the parent post lives |
| `text` | string | Yes | Comment text |
| `target_message_id` | string | Yes | Message ID of the parent post |
| `target_chat_jid` | string | No | Override for the chat JID embedded in the target key. Defaults to `to`. |
| `target_participant` | string | No | Author JID of the parent post. Required when the lib has no stored `messageSecret` for the parent (e.g. you never received the post locally). |

::: tip Inbound comments
Incoming encrypted comments are decrypted by the upstream lib and
dispatched as a regular `message` event with the inner body. The parent
post key surfaces under `comment_target` in `MessageInfo`.
:::

---

## Send Scheduled Call

Schedule a voice or video call in a group.

```
POST /api/v1/sessions/{session_id}/messages/scheduled-call
```

### Request Body

```json
{
  "to": "120363000000000000@g.us",
  "scheduled_timestamp_ms": 1700000000000,
  "call_type": "voice",
  "title": "Weekly Team Sync"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Group JID |
| `scheduled_timestamp_ms` | number | Yes | Scheduled time (Unix ms) |
| `call_type` | string | No | `voice` or `video` (default: `voice`) |
| `title` | string | No | Call title |

---

## Edit Scheduled Call

Cancel or edit a scheduled call.

```
POST /api/v1/sessions/{session_id}/messages/scheduled-call-edit
```

### Request Body

```json
{
  "to": "120363000000000000@g.us",
  "scheduled_call_message_id": "3EB0ABC123...",
  "edit_type": "cancel"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Group JID |
| `scheduled_call_message_id` | string | Yes | Message ID of the scheduled call |
| `edit_type` | string | No | `cancel` (default: `cancel`) |

---

## Send Payment

Send a payment to a contact.

```
POST /api/v1/sessions/{session_id}/messages/send-payment
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "note": "Payment for services",
  "request_message_id": "3EB0ABC123...",
  "transaction_data": "{\"key\":\"value\"}"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `note` | string | No | Payment note |
| `request_message_id` | string | No | Original payment request message ID |
| `transaction_data` | string | No | Transaction data (JSON string) |

---

## Request Payment

Send a payment request to a contact.

```
POST /api/v1/sessions/{session_id}/messages/request-payment
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "currency_code": "USD",
  "amount1000": 50000000,
  "note": "Payment for invoice #123",
  "expiry_timestamp": 1700086400
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `currency_code` | string | Yes | ISO 4217 currency code |
| `amount1000` | number | Yes | Amount in smallest unit * 1000 |
| `note` | string | No | Payment request note |
| `expiry_timestamp` | number | No | Request expiration timestamp |

---

## Cancel Payment Request

Cancel a previously sent payment request.

```
POST /api/v1/sessions/{session_id}/messages/cancel-payment
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "request_message_id": "3EB0ABC123..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `request_message_id` | string | Yes | Message ID of the payment request |

---

## Decline Payment Request

Decline a received payment request.

```
POST /api/v1/sessions/{session_id}/messages/decline-payment
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "request_message_id": "3EB0ABC123..."
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `request_message_id` | string | Yes | Message ID of the payment request |

---

## Send Newsletter Forward

Forward a newsletter message to a contact or group.

```
POST /api/v1/sessions/{session_id}/messages/newsletter-forward
```

### Request Body

```json
{
  "to": "628123456789@s.whatsapp.net",
  "text": "Check out this newsletter post",
  "newsletter_jid": "120363000000000000@newsletter",
  "server_message_id": 42,
  "newsletter_name": "My Newsletter",
  "content_type": "update"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | string | Yes | Recipient JID |
| `text` | string | Yes | Text content |
| `newsletter_jid` | string | Yes | Newsletter JID |
| `server_message_id` | number | Yes | Server message ID from newsletter |
| `newsletter_name` | string | No | Newsletter name |
| `content_type` | string | No | `update`, `update_card`, `link_card` |

---

## Media Data Format

All media endpoints accept either URL or base64:

### URL Format

```json
{
  "url": "https://example.com/file.jpg"
}
```

### Base64 Format

```json
{
  "data": "base64-encoded-data...",
  "mimetype": "image/jpeg"
}
```

### Uploaded Format

If you've already uploaded via the `/media/upload` endpoint:

```json
{
  "url": "https://mmg.whatsapp.net/...",
  "direct_path": "/v/t62.7...",
  "media_key": "base64-key",
  "file_sha256": "base64-sha256",
  "file_enc_sha256": "base64-enc-sha256",
  "file_length": 12345,
  "mimetype": "image/jpeg"
}
```

### Supported MIME Types

| Type | MIME Types |
|------|------------|
| Image | `image/jpeg`, `image/png`, `image/webp` |
| Video | `video/mp4`, `video/3gpp` |
| Audio | `audio/mpeg`, `audio/ogg`, `audio/wav` |
| Document | Any |
| Sticker | `image/webp` |
