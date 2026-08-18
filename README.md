# NestJS Backend Starter

A production-ready **NestJS** backend starter with authentication, role-based access control (RBAC), file storage, and monitoring — ready to be reused for any project.

> Built by [Rangga Prathama](https://github.com/RanggaPrathama) · `ranggaprathama9@gmail.com`

## Features

- **Authentication** — [Better Auth](https://better-auth.com) (email/password) with session status endpoints under `/api/auth`.
- **RBAC** — menus, permissions, roles, and per-route permission guards (`@RequirePermission`), with Redis-backed permission cache.
- **Users** — user CRUD, role assignment, and `/api/me/*` profile endpoints.
- **Storage & Uploads** — local storage driver with presigned upload URLs.
- **API Docs** — Swagger UI + Scalar at `/api/docs` (start the server to view).
- **Monitoring** — Prometheus metrics at `/metrics` and a pre-provisioned Grafana dashboard.
- **Logging** — structured logging with `pino` / `pino-pretty`.
- **Validation** — global `ValidationPipe` (whitelist, transform, forbid non-whitelisted).

## Tech Stack

NestJS 11 · TypeScript · PostgreSQL · TypeORM · Better Auth · Redis · pnpm · Prometheus · Grafana

## Prerequisites

- Node.js >= 20
- pnpm >= 10
- Docker (for PostgreSQL, Redis, Prometheus, Grafana)

## Quickstart

```bash
# 1. Clone the template (use "Use this template" on GitHub)
git clone <your-template-url> my-project
cd my-project

# 2. Rename the project
pnpm init-project my-project

# 3. Configure environment
cp .env.example .env
# Edit .env — set BETTER_AUTH_SECRET (>= 32 chars), DATABASE_*, etc.

# 4. Start infra (PostgreSQL, Redis, Prometheus, Grafana)
docker compose up -d

# 5. Install dependencies
pnpm install

# 6. Run migrations + seed
pnpm run migration:run
pnpm run seed

# 7. Use the app
# API:      http://localhost:3000/api
# Docs:     http://localhost:3000/api/docs
# Metrics:  http://localhost:3000/metrics
# Grafana:  http://localhost:3001  (admin/admin — change in production!)
```

## Project Structure

```
src/
  common/       # decorators, guards, entities, helpers, filters
  config/       # typed config + Joi env validation
  database/     # TypeORM module, DataSource, migrations, seed
  lib/          # Better Auth instance
  docs/         # Swagger/Scalar setup
  modules/
    access-control/   # menus, permissions, roles (RBAC)
    users/            # users, roles, /api/me
    storage/          # local storage driver
    uploads/          # presigned uploads
    redis/            # Redis module (permission cache)
    metrics/          # Prometheus metrics
```

## Scripts

| Task | Command |
|------|---------|
| Rename project | `pnpm init-project <name>` |
| Install deps | `pnpm install` |
| Dev server | `pnpm run start:dev` |
| Build | `pnpm run build` |
| Test | `pnpm test` |
| Lint | `pnpm run lint` |
| Generate migration | `pnpm run migration:generate -- -n Name` |
| Run migrations | `pnpm run migration:run` |

## Environment Variables

See `.env.example` for all variables. Key ones:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | `development` \| `test` \| `production` | `development` |
| `PORT` | HTTP port | `3000` |
| `APP_NAME` | Display name | `NestJS API` |
| `APP_BASE_URL` | Public base URL | `http://localhost:3000` |
| `APP_CORS_ORIGIN` | Comma-separated CORS origins | `*` |
| `DATABASE_*` | PostgreSQL connection | — |
| `BETTER_AUTH_SECRET` | Auth secret (>= 32 chars) | — |
| `REDIS_*` | Redis connection + cache prefix | — |
| `METRICS_ENABLED` | Enable `/metrics` endpoint | `false` |
| `METRICS_PORT` | Port Prometheus scrapes | `3000` |

## Monitoring

- **Metrics endpoint:** `/metrics` (root, outside `/api`), served by the `metrics` module when `METRICS_ENABLED=true`.
- **Prometheus:** `http://localhost:9090` — scrapes `host.docker.internal:3000/metrics` (backend on host).
- **Grafana:** `http://localhost:3001` — pre-provisioned "NestJS Overview" dashboard (request rate, error rate, latency p50/p95/p99, Node.js heap). Default creds `admin`/`admin` — **change in production** (via `GF_SECURITY_ADMIN_PASSWORD` env or Grafana UI).

## License

MIT
