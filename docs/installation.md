---
sidebar_position: 2
---

# Installation

## Quick Start

### Linux (curl one-liner)

```bash
VER=$(curl -fsSL https://api.github.com/repos/imtaqin/waxum/releases/latest | grep -Po '"tag_name": "\K[^"]*')
ARCH=$(uname -m | sed 's/x86_64/amd64/;s/aarch64/arm64/')
curl -fsSL "https://github.com/imtaqin/waxum/releases/download/${VER}/waxum-${VER#v}-linux-${ARCH}.tar.gz" | tar xz
./waxum --token mysecrettoken
```

### Manual download

Download the binary for your platform from [GitHub Releases](https://github.com/imtaqin/waxum/releases) and run:

```bash
./waxum --token mysecrettoken
```

That's it. No database configured — Waxum drops a `waxum.db` SQLite file
next to the binary and stores everything (sessions, webhooks, DLQ) there.
Zero config.

Scale-out or need Postgres / MySQL? Pass a `DATABASE_URL`:

```bash
./waxum --token mysecrettoken --db postgres://user:pass@localhost:5432/waxum
./waxum --token mysecrettoken --db mysql://user:pass@localhost:3306/waxum
```

Schema migrations run automatically at startup on every backend.

## Docker Compose (no clone needed)

Paste this straight into a `docker-compose.yml` — no git clone required:

```yaml
services:
  waxum:
    image: fdciabdul/waxum:latest
    restart: unless-stopped
    ports:
      - "3451:3451"
    volumes:
      - waxum_data:/app/whatsapp_sessions
    environment:
      SUPERADMIN_TOKEN: change-me-to-a-real-secret
      WHATSAPP_STORAGE_PATH: /app/whatsapp_sessions

volumes:
  waxum_data:
```

```bash
docker compose up -d
```

SQLite, zero extra config — everything persists in the `waxum_data`
volume. Want Postgres/MySQL, NATS, or a pinned version instead of
`latest`? See the full setup below.

## Docker Compose (full setup: NATS + pinned versions + Postgres/MySQL)

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

This starts **NATS** (message queue) and the **Waxum API**. By default the
`api` service pulls the prebuilt image from Docker Hub
(`fdciabdul/waxum:latest`) — no local compile step, no Rust toolchain
needed. To pin a specific release instead of always tracking `latest`,
set `WAXUM_TAG` in `.env`:

```bash
WAXUM_TAG=0.12.2
```

(matches the version on [GitHub Releases](https://github.com/imtaqin/waxum/releases)).

To build the image from source instead of pulling it, layer
`docker-compose.build.yml` on top:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

To also run a bundled PostgreSQL:

```bash
docker compose -f docker-compose.yml -f docker-compose.postgres.yml up -d
```

To run **without NATS**, remove or comment out the `NATS_URL` line in `.env`.

Update to the latest image later with:

```bash
docker compose pull && docker compose up -d
```

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

## Database

Waxum runs against three backends. Pick one, or pick none — the default
is fine.

### SQLite (default, zero-config)

Leave `DATABASE_URL` empty and Waxum drops a local SQLite file next to
the binary at `./waxum.db`. Schema is auto-migrated on boot. Good for
development and single-node production.

Override the path if you want:

```bash
./waxum --token mytoken --db sqlite://./data/waxum.db
# or
SQLITE_PATH=./data/waxum.db ./waxum --token mytoken
```

### PostgreSQL

For scale-out, HA, and shared metadata across multiple Waxum nodes:

```bash
sudo -u postgres createdb waxum

./waxum --token mytoken --db postgres://postgres:password@localhost:5432/waxum
```

### MySQL

Same story, MySQL flavour:

```bash
mysql -u root -p -e "CREATE DATABASE waxum;"

./waxum --token mytoken --db mysql://root:password@localhost:3306/waxum
```

Every backend runs the same idempotent `CREATE TABLE IF NOT EXISTS` +
`ALTER TABLE ADD COLUMN IF NOT EXISTS` sequence at startup — no manual
migrations, no `docker compose up` bootstrapping, no schema drift.

:::info Legacy Postgres env vars
If `DATABASE_URL` is unset and you set `POSTGRES_*` or `MYSQL_*` env
vars, Waxum picks those up as fallback. They still work; prefer the
`DATABASE_URL` form for new deployments.

```bash
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
POSTGRES_DB=waxum
```
:::

## Environment Variables

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | *(none — falls back to `sqlite://./waxum.db`)* | Database connection URL (`postgres://`, `mysql://`, or `sqlite://`) |

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
| `RATE_LIMIT_ENABLED` | `false` | Turn on the per-peer-IP rate limiter |
| `RATE_LIMIT_PER_SECOND` | `60` | Per-peer-IP requests/sec allowed on the whole API (only if enabled) |
| `RATE_LIMIT_BURST` | `150` | Burst capacity on top of the sustained rate (only if enabled) |

:::info Behind a reverse proxy
Off by default. The rate limiter keys on the TCP peer address, so
every client behind an unconfigured reverse proxy (Traefik, Dokploy,
nginx, Docker's own port mapping) would share one quota if enabled —
set `RATE_LIMIT_ENABLED=true` only if you actually want that, and
raise `RATE_LIMIT_PER_SECOND`/`RATE_LIMIT_BURST` if the defaults are
too tight for your traffic.
:::

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
