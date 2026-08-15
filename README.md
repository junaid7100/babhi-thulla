# Bhabhi Thulla

A casual multiplayer card game for one host + up to 4 friends (5 players total), played from mobile phones. No accounts, no database — game state lives in memory on the server for the duration of a match.

- **Backend**: Node.js + Express + Socket.io. Holds all game state in memory and is the sole authority on rules (turn order, follow-suit, Thulla detection, escapes, Bhabhi).
- **Frontend**: React (Vite). A thin client that renders server state and sends move requests over WebSockets.

## Rules, in short

Standard 52-card deck, no jokers, no trump. The player holding A♠ leads first. Each trick, follow the lead suit if you can. If you can't and play off-suit, that's a **Thulla** — the trick ends immediately and whoever played the highest lead-suit card picks up every card played so far. If everyone follows suit, the highest lead-suit card just wins the lead and the cards are discarded. The first trick is always discarded even if it's a Thulla. Run out of cards and you escape; last player left holding cards is the **Bhabhi**.

Every room is created with 3 bots already seated (fewer if `maxPlayers` doesn't leave room for all 3), so the host can start playing solo right away. Bots play a random legal card ~1 second after their turn starts. Real players can still join a bot-filled room up to `maxPlayers`. If the last human leaves a room, it's torn down rather than left running bot-vs-bot forever.

## Project layout

```
/backend   — Express + Socket.io server, game engine, in-memory room state
/frontend  — Vite + React client
```

## Running locally

You'll need Node 18+ (Node 22 recommended).

**1. Start the backend** (in one terminal):

```bash
cd backend
npm install
npm test        # runs the game-engine unit test suite
PORT=3001 node server.js
```

The backend listens on `http://localhost:3001`.

**2. Start the frontend** (in another terminal):

```bash
cd frontend
npm install
VITE_SOCKET_URL=http://localhost:3001 npm run dev
```

The frontend runs on `http://localhost:5173`.

**3. Play**: open `http://localhost:5173` in multiple browser tabs (or on phones on the same network via your machine's LAN IP) to simulate multiple players. Create a room in one tab, join it with the room code from the others, and start once you have 3–5 players.

## Deploying to Render

Both services live in the same GitHub repo, deployed as two separate Render services under one account.

### 1. Backend — Render "Web Service"

- **Root directory**: `backend`
- **Build command**: `npm install`
- **Start command**: `node server.js`
- **Environment variables**:
  - `PORT` — set automatically by Render, no action needed (the server reads `process.env.PORT`).
  - `FRONTEND_ORIGIN` — set this **after** the frontend is deployed, to its Render static site URL (e.g. `https://bhabhi-thulla.onrender.com`). Enables CORS for Socket.io. You can pass a comma-separated list if you need to allow more than one origin (e.g. to also allow `http://localhost:5173` while testing).

Note: on Render's free tier, the service spins down after 15 minutes of inactivity. The first connection after idle can take 30–60 seconds to wake it back up — expected and fine for casual use.

### 2. Frontend — Render "Static Site"

- **Root directory**: `frontend`
- **Build command**: `npm install && npm run build`
- **Publish directory**: `dist`
- **Environment variables**:
  - `VITE_SOCKET_URL` — set to the deployed backend's Render URL (e.g. `https://bhabhi-thulla-backend.onrender.com`).

### 3. Step-by-step

1. Push this repo to GitHub.
2. In the Render dashboard, create the backend as a **Web Service** pointing at the repo with root directory `backend`, using the build/start commands above.
3. Once the backend is deployed, note its URL.
4. Create the frontend as a **Static Site** pointing at the same repo with root directory `frontend`, setting `VITE_SOCKET_URL` to the backend's URL from step 3.
5. Once the frontend is deployed, note its URL and go back to the backend service's environment variables to set `FRONTEND_ORIGIN` to that frontend URL.
6. Redeploy the backend (env var changes require a redeploy) so CORS picks up the new origin.

After that, share the frontend URL — anyone can open it on their phone, create or join a room with the 4-character code, and play.

## Testing

```bash
cd backend
npm test
```

Runs the full game-engine unit test suite (`node --test`) covering deck integrity, dealing, follow-suit validation, Thulla detection/resolution, the first-trick discard exception, escapes, Bhabhi determination, and illegal-move rejection.

## Client error logging

The frontend reports uncaught exceptions, unhandled promise rejections, and `console.error()` calls to the backend (`POST /api/log-client-error`), which appends them as JSON lines to `backend/logs/client-errors.log`. This gives a persistent record of what broke in a player's browser without needing them to copy-paste their console. The log directory is gitignored and lives on the backend's local disk, so on Render (no persistent disk on the free plan) it resets whenever the service restarts or redeploys — pull it via the Render shell if you need it before then.

## Out of scope (v1)

Persistent database, user accounts/auth, statistics beyond the current game, spectators, sound effects, host migration on disconnect (if the host disconnects, the game continues; host controls are simply unavailable until they reconnect), rate limiting, and scaling beyond a handful of concurrent casual games.
