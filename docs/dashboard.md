---
sidebar_position: 4
---

# Swagger UI

WA-RS includes an interactive Swagger UI for exploring and testing all API endpoints directly from your browser.

## Accessing Swagger UI

Open your browser and navigate to:

```
http://localhost:3451/swagger-ui
```

The OpenAPI JSON spec is available at:

```
http://localhost:3451/api-docs/openapi.json
```

## Features

- **Interactive API Explorer** - Browse all endpoints organized by tags
- **Try It Out** - Execute API calls directly from the browser
- **Request/Response Examples** - See expected formats for each endpoint
- **Authentication** - Enter your Bearer token to test authenticated endpoints
- **Schema Viewer** - Explore all request/response data models

## Authentication in Swagger

1. Click the **Authorize** button (lock icon) at the top
2. Enter `Bearer YOUR_TOKEN` (your `SUPERADMIN_TOKEN` value or the JWT shown at startup)
3. Click **Authorize**
4. All subsequent requests will include the `Authorization: Bearer <token>` header

## API Tags

Endpoints are organized into the following groups:

| Tag | Description |
|-----|-------------|
| `sessions` | Session management and authentication |
| `messages` | Send and manage messages |
| `contacts` | Contact information and lookup |
| `groups` | Group management |
| `presence` | Online status |
| `chatstate` | Typing indicators |
| `blocking` | Block and unblock contacts |
| `media` | Media upload and download |
| `webhooks` | Webhook registration for events |
| `privacy` | Privacy settings management |
| `mex` | GraphQL/MEX operations |
| `newsletter` | Newsletter/Channel messages |
| `operations` | Spam reporting, TCToken, reconnection, and sync |
| `nats` | NATS JetStream management and status |
