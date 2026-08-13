---
sidebar_position: 10
---

# Health & Liveness

Endpoints for load balancers, container orchestrators, and monitoring
probes. All three probes bypass JWT auth.

## `/livez` — liveness

Static probe. Returns `200 OK` as long as the HTTP server is up. Uses no
downstream dependencies (no DB, no filesystem, no state). Use as the
Kubernetes `livenessProbe` / systemd watchdog / docker HEALTHCHECK — a
`503` here means the process is deadlocked and should be restarted.

```
GET /livez
```

```
OK
```

## `/readyz` — readiness

Probe that also touches the DB pool. Runs `SELECT 1` against the
configured backend (Postgres / MySQL / SQLite) and reports the current
number of in-memory sessions plus per-session liveness (v0.12.0+).
Returns `200` when the DB responds and `503` when it does not.

Use as Kubernetes `readinessProbe` — a `503` here temporarily removes
the pod from the load balancer without killing it, letting the DB
recover.

```
GET /readyz
```

```json
{
  "db": "ok",
  "sessions_known": 500,
  "sessions_live": 498,
  "sessions": [
    {
      "id": "my-session",
      "status": "logged_in",
      "socket_alive": true
    }
  ]
}
```

| Field | Description |
|-------|-------------|
| `db` | `ok` when the DB probe answered, `fail` otherwise |
| `sessions_known` | Session rows known to the DB |
| `sessions_live` | In-memory sessions whose socket is currently alive (v0.12.0+) |
| `sessions` | Per-session `id`, `status`, and `socket_alive` (v0.12.0+). `socket_alive` is raw socket liveness — see [Get Session Status](./sessions.md#get-session-status) |

When the DB probe fails (`503` — the session fields are still reported,
since they come from in-memory state):

```json
{
  "db": "fail",
  "sessions_known": 500,
  "sessions_live": 498,
  "sessions": [
    {
      "id": "my-session",
      "status": "logged_in",
      "socket_alive": true
    }
  ]
}
```

## `/health` — legacy alias

Same shape as `/livez`, kept as a compatibility alias for existing
Docker HEALTHCHECK / uptime monitors. New deployments should point at
`/livez` for liveness and `/readyz` for readiness.

```
GET /health
```

```
OK
```

## Metrics

Prometheus text exposition on `/metrics` (JWT bypass). Counters and
gauges for sessions, webhook dispatch, and message throughput. See the
`prometheus` crate defaults for the metric names.

Session liveness metrics (v0.12.0+):

| Metric | Type | Description |
|--------|------|-------------|
| `waxum_sessions_total` | gauge | Session runtimes resident in memory |
| `waxum_sessions_live` | gauge | Sessions whose upstream client agrees it's live |
| `waxum_session_socket_alive{session_id}` | gauge | Per-session raw socket liveness (`1` = transport connected, `0` = down). Catches the "limbo" case where a cached `logged_in` outlives a dead socket |
| `waxum_session_socket_drops_total{session_id}` | counter | Per-session count of socket drops (`Event::Disconnected`) |
| `waxum_session_reconnects_total{session_id}` | counter | Per-session count of successful reconnects |
