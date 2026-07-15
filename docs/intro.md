---
sidebar_position: 1
slug: /
---

# Introduction

Waxum is a high-performance WhatsApp REST API Gateway built with Rust. It provides a simple and secure way to integrate WhatsApp messaging capabilities into your applications.

## Features

### Core Features
- **Multi-Session Support** - Manage multiple WhatsApp sessions simultaneously
- **QR Code & Pair Code Authentication** - Connect via QR code scanning or 8-digit pair code
- **Webhook Events** - Receive real-time notifications with HMAC-SHA256 signature verification
- **NATS JetStream** - Optional durable event streaming and queue-based outbound messaging
- **RESTful API** - Simple JSON-based API with OpenAPI/Swagger documentation
- **JWT Authentication** - Secure API access with token-based authentication
- **Multi-Database Support** - PostgreSQL and MySQL supported for metadata storage
- **Docker Ready** - Easy deployment with Docker and Docker Compose

### Messaging Capabilities
- **Text Messages** - Send plain text messages
- **Media Messages** - Send images, videos, audio, documents, and stickers
- **Location Sharing** - Share geographical locations
- **Contact Sharing** - Share contact cards (vCards)
- **Message Reactions** - Add emoji reactions to messages
- **Message Editing** - Edit sent messages
- **Voice Notes** - Send push-to-talk audio messages
- **Polls** - Create polls with multiple options
- **Buttons & Lists** - Send interactive button and list messages
- **Interactive Messages** - Native flow interactive messages
- **Newsletter Invites** - Send admin and follower newsletter invitations
- **Business Messages** - Orders, invoices, and payment invitations
- **Pin Messages** - Pin and unpin messages in chats
- **Forward Messages** - Forward messages between chats
- **Scheduled Calls** - Schedule voice/video calls in groups
- **Payment Messages** - Send, request, cancel, and decline payments
- **Comment Messages** - Comment on messages in groups

### Contact & Group Management
- **Contact Lookup** - Check WhatsApp registration, get profiles and user info
- **Group Management** - Create groups, manage participants, admins, and settings
- **Privacy Settings** - View privacy configuration
- **Blocking** - Block and unblock contacts
- **Presence** - Set online status and subscribe to presence updates
- **Chat State** - Send typing and recording indicators

### Advanced Features
- **GraphQL/MEX Operations** - Execute WhatsApp internal GraphQL queries and mutations
- **Spam Reporting** - Report spam messages
- **TCToken Management** - Issue, query, and prune trust contact tokens
- **Auto-Reconnect** - Configure automatic reconnection on disconnect
- **History Sync** - Control message history synchronization
- **Media Upload/Download** - Upload and download encrypted media files

### Developer Experience
- **Swagger UI** - Interactive API documentation at `/swagger-ui`
- **Health Checks** - Built-in health endpoint for monitoring
- **Structured Logging** - JSON-formatted logs with tracing
- **Environment Configuration** - Configure via `.env` or environment variables

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│                        Waxum Gateway                          │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────────┐  ┌───────────────┐   │
│  │   REST API   │  │     Webhook      │  │     NATS      │   │
│  │   (Axum)     │  │   Dispatcher     │  │   JetStream   │   │
│  └──────────────┘  └──────────────────┘  └───────────────┘   │
├──────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐│
│  │              Session Manager (Multi-Device)              ││
│  └──────────────────────────────────────────────────────────┘│
├──────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐  │
│  │ PostgreSQL /   │  │  SQLite (WA)    │  │    NATS      │  │
│  │ MySQL (Meta)   │  │  (Sessions)     │  │  (Streams)   │  │
│  └─────────────────┘  └─────────────────┘  └─────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | Rust |
| Web Framework | Axum 0.8 |
| Database | PostgreSQL or MySQL (metadata) + SQLite (WA sessions) |
| Message Queue | NATS JetStream (optional) |
| Authentication | JWT (jsonwebtoken) |
| WhatsApp Protocol | wacore (custom) |
| Documentation | Swagger/OpenAPI |

## Quick Links

- [Getting Started](./getting-started) - Quick start guide
- [Installation](./installation) - Detailed installation instructions
- [Authentication](./authentication) - JWT authentication guide
- [API Reference](./api/sessions) - Complete API documentation
- [Webhooks](./api/webhooks) - Setting up webhook notifications
- [NATS JetStream](./api/nats) - Event streaming and outbound messaging
