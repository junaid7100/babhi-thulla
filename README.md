# Bhabhi Thulla

A real-time, server-authoritative multiplayer implementation of the Bhabhi
Thulla card game. Built using the **BMAD method** (planning docs in
[`docs/prd.md`](docs/prd.md) and [`docs/architecture.md`](docs/architecture.md),
followed by a phased engine → backend → frontend → integration → test → polish
build).

Live rules recap: standard 52-card deck, no jokers/trump, A♠ leads first,
follow suit or make a **Thulla**, last player holding cards is the **Bhabhi**.
See in-app "How to Play" for the full walkthrough.

## Stack

- **Engine**: TypeScript, pure functions, zero I/O — `server/src/engine`
- **Backend**: Node.js + Express + Socket.IO — `server/src`
- **Database**: PostgreSQL (durability/reconnection layer) — `server/src/db`
- **Frontend**: React + TypeScript + Vite + Tailwind CSS — `client/src`
- **Deploy**: one Render Web Service (serves API + WebSocket + built SPA) + one Render Postgres

## Repository layout

```
/server   Express + Socket.IO backend, game engine, Postgres persistence
/client   React + Vite + Tailwind frontend
/docs     BMAD planning docs (PRD, architecture)
render.yaml   Render Blueprint (web service + Postgres)
```

## Running locally

Requires Node 20+.

```bash
npm install                 # installs both workspaces
npm run build                # builds client (Vite) + server (tsc)
DATABASE_URL=postgres://... npm run start   # or omit DATABASE_URL to run without persistence
```

The server serves the built frontend from the same origin at
`http://localhost:3001` (or `$PORT`). `DATABASE_URL` is optional locally — if
unset, the game still works, it just won't survive a process restart.

For frontend hot-reload during development, run the two workspaces
separately:

```bash
npm run dev:server           # ts-node-dev on :3001
VITE_SOCKET_URL=http://localhost:3001 npm run dev:client   # Vite on :5173
```

### Tests

```bash
cd server
npm test
```

Runs the full `node:test` suite: deck integrity, dealing, follow-suit,
Thulla detection/resolution, normal-trick resolution, escape/Bhabhi logic,
illegal-move rejection, and a real end-to-end Socket.IO integration test
(room creation → join → deal → play-to-Bhabhi) that also exercises the
concurrency guarantee — two near-simultaneous `PLAY_CARD` requests from the
same player can never both succeed.

## Environment variables

| Variable       | Required | Description                                                            |
|----------------|----------|--------------------------------------------------------------------------|
| `PORT`         | no       | Server port (Render sets this automatically).                          |
| `DATABASE_URL` | no*      | Postgres connection string. Enables persistence/reconnection-after-restart. Omit for a DB-less local run. |
| `VITE_SOCKET_URL` | no    | Frontend dev-only: backend URL when running `dev:client` separately.   |

\* Required for the "recover a game after a server restart" guarantee in
production; the app runs without it, just without that guarantee.

## Deploying to Render

**Option A — Blueprint (recommended):** push this repo to GitHub, then in the
Render dashboard choose *New → Blueprint* and point it at the repo. `render.yaml`
provisions the Postgres database and the web service (with `DATABASE_URL`
wired automatically) in one step.

**Option B — manual:**
1. Create a Render **Postgres** instance, note its internal connection string.
2. Create a Render **Web Service** from this repo:
   - Build command: `npm install && npm run build`
   - Start command: `npm run start`
   - Env var `DATABASE_URL` = the Postgres connection string from step 1.
3. Deploy. The service serves both the Socket.IO backend and the built React
   app from a single origin — no separate frontend deploy or CORS config needed.

## Architecture & anti-cheat (short version)

The server is the sole authority on turn order, hand contents, legal moves,
Thulla detection, trick resolution, escapes, and the Bhabhi. The client only
ever sends `PLAY_CARD { cardId }` — a *request*, never an assertion of
legality. Every play is re-validated against the server's own copy of that
player's hand and the current turn/lead-suit state (`server/src/engine/engine.ts`),
inside a per-room mutex that serializes concurrent requests so two
near-simultaneous plays can't both succeed. Private hands are filtered out of
every broadcast except the one sent to their owner (`server/src/realtime/stateView.ts`)
— the frontend has no direct database access at all, so there is no path by
which a client can read another player's cards. Full detail in
[`docs/architecture.md`](docs/architecture.md) §5.

## Known limitations (v1)

- No persistent player accounts, cross-game leaderboards, or matchmaking.
- Spectator mode is not implemented (the state-view split is structured to
  allow it later, but no spectator UI/socket path exists yet).
- Turn auto-play on timeout picks a uniformly random legal card rather than
  a "smart" fallback.
- Postgres persistence is best-effort (fire-and-forget writes); an in-flight
  mutation lost to a crash between the in-memory commit and the DB write is
  a theoretical (very narrow) gap — the in-memory state is authoritative
  while the process is alive.
