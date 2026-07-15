---
sidebar_position: 1
---

# Getting Started

Waxum is a multi-session WhatsApp REST API gateway built with Rust. It provides a simple HTTP interface to interact with WhatsApp Web.

## Features

- **Multi-session support** — Manage multiple WhatsApp accounts
- **QR Code and Pair Code authentication** — Connect via QR scan or phone number
- **Send messages** — Text, image, video, audio, document, sticker, location, contact
- **Interactive messages** — Polls, buttons, lists, payments, newsletters
- **Webhook support** — Receive events with HMAC-SHA256 signatures
- **NATS JetStream** — Optional durable event streaming and outbound message queue
- **JWT authentication** — Secure API access
- **Multi-database support** — PostgreSQL or MySQL via `DATABASE_URL`
- **CLI arguments** — Configure token, database, and port from command line
- **Swagger UI** — Interactive API documentation

## Quick Start

### With MySQL

```bash
./waxum --token mysecrettoken --db mysql://user:pass@localhost:3306/wars
```

### With PostgreSQL

```bash
./waxum --token mysecrettoken --db postgres://user:pass@localhost:5432/wagateway
```

```bash
# Test it
curl -H "Authorization: Bearer mysecrettoken" http://localhost:3451/health
```

## Using Docker Compose

```bash
git clone https://github.com/imtaqin/waxum.git
cd waxum

# Create .env
cat > .env << 'EOF'
DATABASE_URL=mysql://user:pass@host:3306/wars
SUPERADMIN_TOKEN=mysecrettoken
EOF

docker compose up -d
```

## Build from Source

1. **Requirements**
   - Rust nightly
   - PostgreSQL 14+ or MySQL 8+

2. **Clone and build**
   ```bash
   git clone https://github.com/imtaqin/waxum.git
   cd waxum
   rustup default nightly
   cargo build --release
   ```

3. **Run**
   ```bash
   # With MySQL
   ./target/release/waxum --token mysecrettoken --db mysql://user:pass@localhost/mydb

   # With PostgreSQL
   ./target/release/waxum --token mysecrettoken --db postgres://user:pass@localhost/wagateway

   # With .env file
   cp .env.example .env
   # Edit .env with your settings
   ./target/release/waxum
   ```

## CLI Options

```
Usage: waxum [OPTIONS]

Options:
  -t, --token <TOKEN>    Set superadmin token
  -d, --db <URL>         Set database URL (postgres/mysql)
  -p, --port <PORT>      Set server port (default: 3451)
  -h, --help             Show help
```

CLI arguments override `.env` values.

## Access Points

After starting the server:

| Endpoint | Description |
|----------|-------------|
| `http://localhost:3451/health` | Health Check |
| `http://localhost:3451/swagger-ui` | Swagger UI Documentation |
| `http://localhost:3451/api/v1/sessions` | Sessions API |
| `http://localhost:3451/api/v1/nats/status` | NATS Status (if enabled) |

## Next Steps

- [Installation Guide](./installation) — Detailed setup for Docker, Linux, Windows
- [Authentication](./authentication) — Token setup and API authentication
- [API Reference](./api/sessions) — Complete API documentation
- [Webhooks](./api/webhooks) — Real-time event notifications
- [NATS JetStream](./api/nats) — Event streaming and outbound messaging
