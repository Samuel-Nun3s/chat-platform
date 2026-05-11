# Accord — Backend

NestJS API + WebSocket gateway. See the [root README](../README.md) for the full project overview, architecture, and setup instructions.

## Quick start

```bash
cp .env.example .env          # fill in DB/Redis/JWT values
npm install
npm run start:dev             # http://localhost:3000
```

Postgres and Redis must be running — `docker compose up -d` from the root brings them up.

## Common scripts

| Command | What it does |
|---|---|
| `npm run start:dev` | watch mode (recompiles on save) |
| `npm run start` | one-shot start (no watch) |
| `npm run build` | compile to `dist/` |
| `npx tsc --noEmit` | type-check only |

## Useful endpoints to verify it's up

- `GET /health` — quick health check
- `POST /auth/register` — create a user
- `POST /auth/login` — get tokens
