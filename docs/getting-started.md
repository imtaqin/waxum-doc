---
sidebar_position: 1
---

# Getting Started

WA-RS is a multi-session WhatsApp REST API gateway built with Rust. It provides a simple HTTP interface to interact with WhatsApp Web.

## Features

- **Multi-session support** - Manage multiple WhatsApp accounts
- **QR Code & Pair Code authentication** - Connect via QR scan or phone number
- **Send messages** - Text, image, video, audio, document, sticker, location, contact
- **Webhook support** - Receive events with HMAC-SHA256 signatures
- **NATS JetStream** - Optional durable event streaming and outbound message queue
- **JWT authentication** - Secure API access
- **Multi-database support** - PostgreSQL, MySQL, or SQLite via `DATABASE_URL`
- **Swagger UI** - Interactive API documentation

## Quick Start

### Using Docker Compose (Recommended)

```bash
git clone https://github.com/fdciabdul/wa-rs.git
cd wa-rs
docker compose up -d
```

### Manual Installation

1. **Requirements**
   - Rust 1.75+
   - One of: PostgreSQL 14+, MySQL 8+, or SQLite 3

2. **Clone and build**
   ```bash
   git clone https://github.com/fdciabdul/wa-rs.git
   cd wa-rs
   cargo build --release
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env — set DATABASE_URL for your database:
   # DATABASE_URL=postgres://user:pass@localhost:5432/wagateway
   # DATABASE_URL=mysql://user:pass@localhost:3306/wagateway
   # DATABASE_URL=sqlite://wa-rs.db
   ```

4. **Run**
   ```bash
   cargo run --release
   ```

## Access Points

After starting the server:

| Endpoint | Description |
|----------|-------------|
| http://localhost:3451 | API Base URL |
| http://localhost:3451/swagger-ui | Swagger UI Documentation |
| http://localhost:3451/health | Health Check |
| http://localhost:3451/api/v1/nats/status | NATS Status (if enabled) |

## Next Steps

- [Installation Guide](./installation) - Detailed setup instructions
- [Authentication](./authentication) - How to authenticate API requests
- [API Reference](./api/sessions) - Complete API documentation
- [NATS JetStream](./api/nats) - Event streaming and outbound messaging
