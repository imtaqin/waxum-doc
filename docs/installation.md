---
sidebar_position: 2
---

# Installation

## Quick Start (No Setup)

Download the binary for your platform from [GitHub Releases](https://github.com/fdciabdul/wa-rs/releases) and run:

```bash
./wa-rs --token mysecrettoken
```

Uses local SQLite by default — no database server needed.

## Docker Compose

```bash
git clone https://github.com/fdciabdul/wa-rs.git
cd wa-rs
```

Create a `.env` file:

```bash
# Database — choose one:
DATABASE_URL=sqlite://wa-rs.db
# DATABASE_URL=postgres://user:password@localhost:5432/wagateway
# DATABASE_URL=mysql://user:password@localhost:3306/wagateway

# Authentication
SUPERADMIN_TOKEN=your-secret-token

# Optional
JWT_SECRET=your-jwt-signing-secret
WHATSAPP_STORAGE_PATH=/app/whatsapp_sessions
RUST_LOG=wa_rs=info,tower_http=info
```

Then run:

```bash
docker compose up -d
```

This starts **NATS** (message queue) and the **WA-RS API**. To also run a bundled PostgreSQL:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d
```

To run **without NATS**, remove or comment out the `NATS_URL` line in `.env`.

## Build from Source

### Linux (Ubuntu/Debian)

```bash
# Install dependencies
sudo apt-get update
sudo apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    libsqlite3-dev

# Install Rust nightly
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default nightly

# Clone and build
git clone https://github.com/fdciabdul/wa-rs.git
cd wa-rs
cargo build --release

# Run
./target/release/wa-rs --token mysecrettoken
```

### Windows

```powershell
# 1. Install Rust from https://rustup.rs
# 2. Open a new terminal after installation

# Install nightly toolchain
rustup default nightly

# Clone and build
git clone https://github.com/fdciabdul/wa-rs.git
cd wa-rs
cargo build --release

# Run
.\target\release\wa-rs.exe --token mysecrettoken
```

### macOS

```bash
# Install Xcode command line tools
xcode-select --install

# Install Rust nightly
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default nightly

# Clone and build
git clone https://github.com/fdciabdul/wa-rs.git
cd wa-rs
cargo build --release

# Run
./target/release/wa-rs --token mysecrettoken
```

## CLI Arguments

```
Usage: wa-rs [OPTIONS]

Options:
  -t, --token <TOKEN>    Set superadmin token
  -d, --db <URL>         Set database URL (postgres/mysql/sqlite)
  -p, --port <PORT>      Set server port (default: 3451)
  -h, --help             Show help
```

Examples:

```bash
# SQLite with custom token (simplest)
./wa-rs --token mysecrettoken

# MySQL with custom port
./wa-rs --token mytoken --db mysql://user:pass@localhost:3306/wars --port 8080

# PostgreSQL
./wa-rs -t mytoken -d postgres://user:pass@localhost:5432/wagateway

# SQLite with specific file
./wa-rs -t mytoken -d sqlite://data/wa-rs.db
```

CLI arguments override `.env` values.

## Database Setup

WA-RS supports **PostgreSQL**, **MySQL**, and **SQLite**. If no database is configured, it defaults to SQLite (`wa-rs.db` in the current directory).

### SQLite (Default — No Setup)

```bash
# Just run — database file created automatically
./wa-rs --token mytoken

# Or specify a path
./wa-rs --token mytoken --db sqlite://data/wa-rs.db
```

### PostgreSQL

```bash
# Create database
sudo -u postgres createdb wagateway

# Run
./wa-rs --token mytoken --db postgres://postgres:password@localhost:5432/wagateway
```

### MySQL

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE wars;"

# Run
./wa-rs --token mytoken --db mysql://root:password@localhost:3306/wars
```

:::info Legacy PostgreSQL Config
If you don't set `DATABASE_URL`, WA-RS checks for legacy `POSTGRES_*` environment variables. If those aren't set either, it defaults to SQLite.
```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=wagateway
```
:::

## Environment Variables

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite://wa-rs.db` | Database connection URL (postgres/mysql/sqlite) |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPERADMIN_TOKEN` | *(auto-generated JWT)* | API access token (any string) |
| `JWT_SECRET` | *(random)* | JWT signing secret (for auto-generated tokens) |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3451` | Server port |
| `WHATSAPP_STORAGE_PATH` | `./whatsapp_sessions` | Session storage path |
| `RUST_LOG` | `info` | Log level (`debug`, `info`, `warn`, `error`) |

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

## Sample `.env` Files

### Minimal (SQLite)

```bash
SUPERADMIN_TOKEN=mysecrettoken
```

### MySQL

```bash
DATABASE_URL=mysql://user:password@localhost:3306/wars
SUPERADMIN_TOKEN=mysecrettoken
RUST_LOG=wa_rs=info,tower_http=info
```

### PostgreSQL with NATS

```bash
DATABASE_URL=postgres://user:password@localhost:5432/wagateway
SUPERADMIN_TOKEN=mysecrettoken
JWT_SECRET=your-jwt-signing-secret
WHATSAPP_STORAGE_PATH=./whatsapp_sessions
NATS_URL=nats://localhost:4222
RUST_LOG=wa_rs=info,tower_http=info
```

## Verify Installation

```bash
# Health check
curl http://localhost:3451/health
# Should return: OK

# Authenticated request
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3451/api/v1/sessions

# Open Swagger UI in browser
open http://localhost:3451/swagger-ui
```
