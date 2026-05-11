# Accord — Frontend

React + TypeScript + Vite. See the [root README](../README.md) for the full project overview, architecture, and setup instructions.

## Quick start

```bash
cp .env.example .env          # optional — defaults to http://localhost:3000
npm install
npm run dev                   # http://localhost:5173
```

The backend must be running first (`cd ../backend && npm run start:dev`).

## Common scripts

| Command | What it does |
|---|---|
| `npm run dev` | dev server with HMR |
| `npm run build` | type-check + production build to `dist/` |
| `npm run preview` | serve the built bundle locally |
| `npx tsc --noEmit` | type-check only |

## Env vars

| Variable | Default | Purpose |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:3000` | Backend URL (used by HTTP and WebSocket clients) |
