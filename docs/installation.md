---
sidebar_position: 2
---

# Installation

## Docker Compose (Recommended)

The easiest way to run WA-RS is using Docker Compose:

```bash
git clone https://github.com/fdciabdul/wa-rs.git
cd wa-rs
docker compose up -d
```

This will start:
- **PostgreSQL** — metadata database (default)
- **NATS** — JetStream message queue (optional, for event streaming)
- **WA-RS API** — the REST API server

### Custom Configuration

Create a `.env` file to customize settings:

```bash
# Database — choose one:
DATABASE_URL=postgres://postgres:your-password@postgres:5432/wagateway
# DATABASE_URL=mysql://user:password@host:3306/wagateway
# DATABASE_URL=sqlite://wa-rs.db

# JWT
JWT_SECRET=your-super-secret-jwt-key

# Storage
WHATSAPP_STORAGE_PATH=/app/whatsapp_sessions

# NATS JetStream (optional — remove NATS_URL to disable)
NATS_URL=nats://nats:4222
NATS_EVENTS_STREAM=WA_EVENTS
NATS_SEND_STREAM=WA_SEND
NATS_EVENTS_MAX_AGE_DAYS=7
NATS_SEND_MAX_AGE_DAYS=1
```

Then run:

```bash
docker compose up -d
```

To run **without NATS**, remove or comment out the `NATS_URL` line — the API will run in webhooks-only mode.

## Manual Installation

### Prerequisites

- Rust 1.75 or later
- One of: PostgreSQL 14+, MySQL 8+, or SQLite 3
- OpenSSL development libraries

### Ubuntu/Debian

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    libsqlite3-dev

# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### Build

```bash
git clone https://github.com/fdciabdul/wa-rs.git
cd wa-rs
cargo build --release
```

### Database Setup

WA-RS supports **PostgreSQL**, **MySQL**, and **SQLite**. Choose one:

#### PostgreSQL

```bash
# Create database
sudo -u postgres createdb wagateway

# Set DATABASE_URL
DATABASE_URL=postgres://postgres:password@localhost:5432/wagateway
```

#### MySQL

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE wagateway;"

# Set DATABASE_URL
DATABASE_URL=mysql://root:password@localhost:3306/wagateway
```

#### SQLite (simplest — no server needed)

```bash
# Just set the path — the file will be created automatically
DATABASE_URL=sqlite://wa-rs.db
```

### Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# Pick your database
DATABASE_URL=postgres://postgres:your-password@localhost:5432/wagateway

# JWT
JWT_SECRET=your-secret-key

# Storage
WHATSAPP_STORAGE_PATH=./whatsapp_sessions
```

:::info Legacy PostgreSQL Config
If you don't set `DATABASE_URL`, WA-RS falls back to the legacy `POSTGRES_*` environment variables for backward compatibility:
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=wagateway
```
:::

### Run

```bash
# Development
cargo run

# Production
./target/release/wa-rs
```

## Environment Variables

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | *(none)* | Database connection URL (postgres/mysql/sqlite) |
| `POSTGRES_HOST` | localhost | PostgreSQL host (legacy fallback) |
| `POSTGRES_PORT` | 5432 | PostgreSQL port (legacy fallback) |
| `POSTGRES_USER` | postgres | PostgreSQL user (legacy fallback) |
| `POSTGRES_PASSWORD` | postgres | PostgreSQL password (legacy fallback) |
| `POSTGRES_DB` | wagateway | PostgreSQL database (legacy fallback) |

### Core

| Variable | Default | Description |
|----------|---------|-------------|
| `JWT_SECRET` | (random) | JWT signing secret |
| `SUPERADMIN_TOKEN` | (random) | Fixed superadmin token (optional) |
| `WHATSAPP_STORAGE_PATH` | ./whatsapp_sessions | Session storage path |
| `RUST_LOG` | info | Log level |

### NATS JetStream (Optional)

| Variable | Default | Description |
|----------|---------|-------------|
| `NATS_URL` | *(none)* | NATS server URL — **required** to enable NATS |
| `NATS_EVENTS_STREAM` | `WA_EVENTS` | Stream name for incoming events |
| `NATS_SEND_STREAM` | `WA_SEND` | Stream name for outbound commands |
| `NATS_EVENTS_MAX_AGE_DAYS` | `7` | Max age for event messages (days) |
| `NATS_SEND_MAX_AGE_DAYS` | `1` | Max age for outbound commands (days) |
| `NATS_TOKEN` | *(none)* | Authentication token |
| `NATS_CREDS_FILE` | *(none)* | Path to credentials file |

## Verify Installation

```bash
# Health check
curl http://localhost:3451/health
# Should return: OK

# Check Swagger UI
open http://localhost:3451/swagger-ui

# Check NATS status (if enabled)
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3451/api/v1/nats/status
```
