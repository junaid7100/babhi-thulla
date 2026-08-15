# Architecture — Bhabhi Thulla

*(BMAD-style architecture doc — Architect phase)*

## Overview

Two deployables, one repo:

```
/backend   Node.js + Express + Socket.io — in-memory game authority
/frontend  React (Vite) — thin client, renders server state
```

No database. Game/room state lives in a `Map` in the backend process for the lifetime of each room (max 15 minutes). This is intentionally disposable — acceptable because the product is a casual private game, not a persistent service.

## Backend

- `gameEngine.js` — pure functions (deck, deal, `validateAndApplyMove`, `resolveTrick`). No I/O, no socket code — unit-testable standalone. This is the single source of truth for rules; see `docs/game-rules.md`.
- `rooms.js` — in-memory room/player state manager (create/join/leave/reconnect/play/rematch), calls into `gameEngine.js`.
- `socketHandlers.js` — wires Socket.io events to `rooms.js`, builds **per-player views** (a given socket only ever receives its own hand — never another player's cards), schedules bot "thinking" delays and human turn timers (auto-play on timeout), and room expiry.
- `bot.js` — picks a random legal card for bot turns and human auto-play-on-timeout.
- Server authority is non-negotiable: the client only ever requests "play card X"; every rule (turn order, follow-suit, Thulla, escapes, Bhabhi) is enforced server-side.

## Frontend

- `socket.js` — singleton Socket.io client connection.
- `hooks/useGameState.js` — subscribes to socket events, exposes the current player-specific view, persists `{roomCode, playerId}` to `localStorage` for reconnect-on-refresh.
- `components/` — `Lobby`, `GameTable`, `PlayingCard` (+ `CardBack`), `OpponentSeat`, `ThullaBanner`, `GameOverPanel`.
- `theme.jsx` — shared visual language: color tokens, the backyard-scene background, wood-table/panel styles, avatar frame colors, ribbon styles, small inline-SVG icons (hamburger, chat). Centralizing this here is what let the whole app get reskinned to match the reference screenshot without touching game logic.
- `version.js` — `BUILD_NUMBER`, shown bottom-left; bump on every shipped change (see `CLAUDE.md`).

## Data flow

1. Client emits an intent (`CREATE_ROOM`, `JOIN_ROOM`, `START_GAME`, `PLAY_CARD`, ...).
2. `socketHandlers.js` validates against `rooms.js`/`gameEngine.js`. Rejections come back as a single `ERROR` event with a human-readable message.
3. On success, the server rebuilds a **per-player state view** (`buildStateView`) and emits `STATE_UPDATE` individually to every connected player in the room, plus any side-effect events (`THULLA`, `PLAYER_ESCAPED`, `GAME_FINISHED`, `TURN_AUTO_PLAYED`, `ROOM_EXPIRED`).
4. The frontend is a pure renderer of the latest `STATE_UPDATE` — it holds no independent game logic beyond client-side legality *hints* (fading illegal cards), which the server re-validates regardless.

## Deployment

Two Render services from the same repo (see `README.md` for exact steps and `render.yaml` for the blueprint):

- **Backend** — Render Web Service, root `backend/`, `node server.js`. Free tier sleeps after 15 min idle; first request after sleep takes 30–60s to wake.
- **Frontend** — Render Static Site, root `frontend/`, build `npm install && npm run build`, publish `dist/`, `VITE_SOCKET_URL` pointed at the backend's Render URL.

## Testing

- `backend/gameEngine.test.js` — 17 unit tests via Node's built-in test runner (`node --test`), covering deck integrity, dealing, first-player detection, follow-suit enforcement, Thulla detection/resolution, the first-trick discard exception, escapes, Bhabhi end condition, hand sort order, and illegal-move rejection.
- Manual/Playwright smoke test of the full client (home → lobby → table → Thulla → hand render) against a running dev server before each deploy.
