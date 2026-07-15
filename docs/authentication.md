---
sidebar_position: 3
---

# Authentication

Waxum uses token-based authentication. All API endpoints (except `/health` and `/swagger-ui`) require a valid token.

## Setting Your Token

There are three ways to set your superadmin token:

### 1. CLI Argument (recommended for quick start)

```bash
./waxum --token YOUR_TOKEN
```

### 2. Environment Variable

```bash
export SUPERADMIN_TOKEN=YOUR_TOKEN
```

### 3. `.env` File

```bash
SUPERADMIN_TOKEN=YOUR_TOKEN
```

Your token can be **any string** you choose (e.g. `my-secret-token-123`). No need to generate a JWT manually.

:::tip
If you don't set `SUPERADMIN_TOKEN`, Waxum auto-generates a JWT token and prints it to the console on startup. Setting your own token is simpler and recommended.
:::

## Using the Token

Include the token in the `Authorization` header with the `Bearer` prefix:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3451/api/v1/sessions
```

## Request Examples

### List Sessions

```bash
curl -X GET \
  -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3451/api/v1/sessions
```

### Create Session

```bash
curl -X POST \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id": "my-session", "name": "My Account"}' \
  http://localhost:3451/api/v1/sessions
```

## Error Responses

### Missing Token

```json
{
  "error": "Unauthorized",
  "message": "Missing or invalid Authorization header. Use: Bearer <token>"
}
```

### Invalid Token

```json
{
  "error": "Unauthorized",
  "message": "Invalid token format"
}
```

### Expired Token (JWT only)

```json
{
  "error": "Unauthorized",
  "message": "Token has expired"
}
```

## How Authentication Works

Waxum checks tokens in this order:

1. **SUPERADMIN_TOKEN match** — if the Bearer token matches `SUPERADMIN_TOKEN`, access is granted immediately
2. **JWT validation** — if no match, the token is decoded as a JWT signed with `JWT_SECRET`

This means you can use either a plain string token or a JWT token.

## JWT Configuration (Advanced)

If you prefer JWT tokens, you can set a custom signing secret:

```bash
JWT_SECRET=your-super-secure-secret-key
```

The auto-generated JWT token contains:

```json
{
  "sub": "superadmin",
  "role": "superadmin",
  "exp": 1798679117,
  "iat": 1767143117
}
```

| Field | Description |
|-------|-------------|
| `sub` | Subject (user identifier) |
| `role` | User role (must be "superadmin") |
| `exp` | Expiration timestamp (1 year from generation) |
| `iat` | Issued at timestamp |

## Using Swagger UI

To authenticate API requests in Swagger UI:

1. Open Swagger UI at `http://localhost:3451/swagger-ui`
2. Click the **"Authorize"** button (lock icon) at the top right
3. Enter your token:
   ```
   Bearer YOUR_TOKEN
   ```
4. Click **"Authorize"** then **"Close"**
5. All API requests will now include your token

## Public Endpoints

These endpoints don't require authentication:

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Health check |
| `GET /swagger-ui/*` | Swagger UI |
| `GET /api-docs/*` | OpenAPI spec |
