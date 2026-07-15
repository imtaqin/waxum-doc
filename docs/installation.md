---
sidebar_position: 2
---

# Installation

## Quick Start

Download the binary for your platform from [GitHub Releases](https://github.com/imtaqin/waxum/releases) and run:

```bash
./waxum --token mysecrettoken --db mysql://user:pass@localhost:3306/wars
```

A PostgreSQL or MySQL database is required for metadata storage.

## Docker Compose

```bash
git clone https://github.com/imtaqin/waxum.git
cd waxum
```

Create a `.env` file:

```bash
# Database — choose one:
DATABASE_URL=mysql://user:password@host:3306/wars
# DATABASE_URL=postgres://user:password@localhost:5432/wagateway

# Authentication
SUPERADMIN_TOKEN=your-secret-token

# Optional
JWT_SECRET=your-jwt-signing-secret
WHATSAPP_STORAGE_PATH=/app/whatsapp_sessions
RUST_LOG=waxum=info,tower_http=info
```

Then run:

```bash
docker compose up -d
```

This starts **NATS** (message queue) and the **Waxum API**. To also run a bundled PostgreSQL:

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
git clone https://github.com/imtaqin/waxum.git
cd waxum
cargo build --release

# Run
./target/release/waxum --token mysecrettoken --db mysql://user:pass@localhost/wars
```

### Windows

The prebuilt release binary is compiled with `x86_64-pc-windows-gnu`
(MinGW runtime is statically linked) so it runs on a fresh Windows
install without needing the Microsoft Visual C++ Redistributable
(`VCRUNTIME140.dll`). Just download the `.zip`, extract, and run.

To build from source:

```powershell
# 1. Install Rust from https://rustup.rs
# 2. Open a new terminal after installation

# Install nightly toolchain + the GNU target
rustup default nightly
rustup target add x86_64-pc-windows-gnu

# MinGW for the C toolchain
choco install mingw -y

# Clone and build
git clone https://github.com/imtaqin/waxum.git
cd waxum
cargo build --release --target x86_64-pc-windows-gnu

# Run
.\target\x86_64-pc-windows-gnu\release\waxum.exe --token mysecrettoken --db mysql://user:pass@localhost/wars
```

If you build with the default MSVC target instead
(`cargo build --release` without `--target`), the resulting binary
depends on `VCRUNTIME140.dll` and will fail with a "DLL not found"
error on machines without the VC++ Redistributable installed.

### macOS

```bash
# Install Xcode command line tools
xcode-select --install

# Install Rust nightly
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
rustup default nightly

# Clone and build
git clone https://github.com/imtaqin/waxum.git
cd waxum
cargo build --release

# Run
./target/release/waxum --token mysecrettoken --db postgres://user:pass@localhost/wagateway
```

## CLI Arguments

```
Usage: waxum [OPTIONS]

Options:
  -t, --token <TOKEN>    Set superadmin token
  -d, --db <URL>         Set database URL (postgres/mysql)
  -p, --port <PORT>      Set server port (default: 3451)
  -h, --help             Show help
```

Examples:

```bash
# MySQL with custom port
./waxum --token mytoken --db mysql://user:pass@localhost:3306/wars --port 8080

# PostgreSQL
./waxum -t mytoken -d postgres://user:pass@localhost:5432/wagateway
```

CLI arguments override `.env` values.

## Database Setup

Waxum requires **PostgreSQL** or **MySQL** for metadata storage (sessions, webhooks). WhatsApp session data is stored separately in local SQLite files.

### PostgreSQL

```bash
# Create database
sudo -u postgres createdb wagateway

# Run
./waxum --token mytoken --db postgres://postgres:password@localhost:5432/wagateway
```

### MySQL

```bash
# Create database
mysql -u root -p -e "CREATE DATABASE wars;"

# Run
./waxum --token mytoken --db mysql://root:password@localhost:3306/wars
```

:::info Legacy PostgreSQL Config
If you don't set `DATABASE_URL`, Waxum checks for legacy `POSTGRES_*` or `MYSQL_*` environment variables as fallback.
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
| `DATABASE_URL` | *(none — required)* | Database connection URL (`postgres://` or `mysql://`) |

### Authentication

| Variable | Default | Description |
|----------|---------|-------------|
| `SUPERADMIN_TOKEN` | *(auto-generated JWT)* | API access token (any string) |
| `JWT_SECRET` | *(random)* | JWT signing secret (for auto-generated tokens) |

### Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3451` | Server port |
| `WHATSAPP_STORAGE_PATH` | `./whatsapp_sessions` | WhatsApp session storage path (SQLite files) |
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

### MySQL (Recommended)

```bash
DATABASE_URL=mysql://user:password@localhost:3306/wars
SUPERADMIN_TOKEN=mysecrettoken
RUST_LOG=waxum=info,tower_http=info
```

### PostgreSQL with NATS

```bash
DATABASE_URL=postgres://user:password@localhost:5432/wagateway
SUPERADMIN_TOKEN=mysecrettoken
JWT_SECRET=your-jwt-signing-secret
WHATSAPP_STORAGE_PATH=./whatsapp_sessions
NATS_URL=nats://localhost:4222
RUST_LOG=waxum=info,tower_http=info
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
