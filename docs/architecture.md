# Architecture — Bhabhi Thulla

_Method: BMAD — Architecture Phase_

## 1. Stack

| Layer     | Choice                                                                 |
|-----------|-------------------------------------------------------------------------|
| Frontend  | React 18 + TypeScript + Vite + Tailwind CSS                            |
| Backend   | Node.js + TypeScript + Express + Socket.IO                             |
| Database  | PostgreSQL (Render managed) via `pg`                                   |
| Transport | WebSockets (Socket.IO) for realtime; REST only for health/log endpoints |
| Deploy    | Single Render Web Service (serves API + WS + built SPA) + Render Postgres |
| IDs       | `crypto.randomUUID()` for games/players; short base32-ish room codes    |

Single-service deploy: the Express server serves the built Vite bundle as
static files in production, and the same origin handles the Socket.IO
upgrade. This removes cross-origin WS/CORS complexity on Render's free tier
and keeps the deployment to one web service + one database.

## 2. Repository Layout

```
/server
  src/
    engine/
      types.ts        — Card, Suit, Rank, Player, GameState, PlayedCard
      rules.ts         — RULES config object (spec §71)
      deck.ts           — createDeck, shuffleDeck (crypto RNG), dealCards
      engine.ts         — findStartingPlayer, getLegalCards, validateMove,
                            playCard, detectThulla, resolveTrick, resolvePickup,
                            discardTrick, checkPlayerEscape, checkGameEnd,
                            getNextActivePlayer
    db/
      pool.ts           — pg Pool
      schema.sql        — DDL
      repository.ts     — persistence for games/players/events
    realtime/
      rooms.ts          — in-memory authoritative room registry (source of truth
                            during a live game; Postgres is the durability layer
                            so a restart can rehydrate)
      roomCodes.ts
      socketHandlers.ts — CREATE_ROOM/JOIN_ROOM/START_GAME/PLAY_CARD/... events
      stateView.ts      — builds per-player public/private views
      turnTimer.ts
      hostMigration.ts
    server.ts           — express bootstrap, static hosting, socket.io wiring
  tests/
    engine.test.ts       — node:test unit suite
    concurrency.test.ts
/client
  src/
    api/socket.ts
    state/useGameConnection.ts  — single hook owning the socket + reducer
    screens/ (Home, CreateRoom, JoinRoom, Lobby, Game, Results, HowToPlay, Settings)
    components/ (Card, Hand, OpponentSeat, TrickArea, ThullaBanner, TurnBadge, ...)
    engine-shared/ (pure display helpers only — no rule logic)
/docs
  prd.md, architecture.md
render.yaml
```

Rule logic exists in exactly one place: `server/src/engine`. It has zero
dependencies on Express/Socket.IO/DB so it is independently unit-testable
(spec §60/§48) and is the only code path that decides turn order, legality,
Thulla, trick winners, escapes, and the Bhabhi.

## 3. Server Authority Model

Client → server messages are always *requests*, never assertions of fact:

```
CREATE_ROOM { displayName, maxPlayers }
JOIN_ROOM   { roomCode, displayName }
START_GAME  { }
PLAY_CARD   { cardId }
LEAVE_ROOM  { }
RECONNECT   { roomId, playerId, playerSecret }
PLAY_AGAIN  { }
```

Server → client events:

```
ROOM_UPDATED, GAME_STARTED, STATE_UPDATE (player-scoped), HAND_UPDATED,
TURN_CHANGED, CARD_PLAYED, THULLA, TRICK_RESOLVED, PLAYER_ESCAPED,
PLAYER_DISCONNECTED, PLAYER_RECONNECTED, HOST_CHANGED, GAME_FINISHED, ERROR
```

`PLAY_CARD` only ever carries a `cardId`. The engine looks up whether that
card is actually in the sender's server-side hand, whether it's their turn,
and whether the play is legal — the client's own idea of "legal" is UX only.

### Race conditions / concurrency

Each room has a single in-memory `GameRoom` object mutated only inside a
per-room async mutex (`withRoomLock`). All `PLAY_CARD` handlers for a room
acquire the same lock before reading `currentPlayerId`, so two near-simultaneous
requests are serialized — the second sees the already-updated turn and is
rejected with `"It is no longer your turn."`. Every mutation is followed by an
async, best-effort Postgres write (`persistRoomSnapshot`) so a server restart
can rehydrate from the latest committed snapshot; the in-memory state remains
authoritative while the process is alive.

## 4. Data Model (Postgres)

```sql
games(id uuid pk, room_code text unique, status text, host_player_id uuid,
      max_players int, current_player_id uuid, lead_suit text,
      current_trick jsonb, discard_pile jsonb, turn_number int,
      trick_number int, thulla_count int, escape_order jsonb,
      bhabhi_player_id uuid, created_at, started_at, finished_at)

players(id uuid pk, game_id uuid fk, display_name text, seat int,
        connected boolean, status text, hand jsonb, escaped_at int,
        finish_position int, is_bot boolean, player_secret text)

game_events(id bigserial pk, game_id uuid fk, type text, payload jsonb,
            created_at)
```

`hand` (private cards) lives only in the `players` row and is never joined
into any query the frontend can trigger — the frontend has no direct DB
access at all; it only ever talks to the Socket.IO/Express layer, which
applies the per-player view filter in `stateView.ts` before anything is
serialized to a socket. This is the Postgres-backed equivalent of Supabase
RLS: enforcement happens in the one code path that is allowed to read the
table, rather than at the DB layer, because the client has no DB credentials
at all.

`player_secret` (a second random token, distinct from the player id) is set
in an httpOnly-equivalent client-stored value used only to authorize
`RECONNECT` — knowing a player's UUID alone (e.g., guessed from a URL) is not
sufficient to hijack their seat.

## 5. Anti-cheat Summary

1. **Hidden information stays server-side.** `stateView.ts` builds two
   payloads per broadcast: the public table view (names, card counts, trick,
   turn, escape order) sent to the room, and one private `HAND_UPDATE` sent
   only to the owning socket. No code path ever serializes another player's
   `hand` array.
2. **All decisions are recomputed server-side from server state.** The
   engine takes the room's authoritative `hands`/`currentTrick`/`leadSuit`
   and the requested `cardId`; it never trusts a client-supplied legality
   flag, winner, or Thulla determination.
3. **Idempotency & turn locking.** Each `PLAY_CARD` is processed inside the
   room's mutex and checked against the current `currentPlayerId` and the
   card's presence in that player's *current* hand array — a card already
   played is no longer present, so replays/duplicates fail validation.
4. **Rate limiting.** Per-socket token bucket on mutating events prevents
   flooding; input (`displayName`, room code) is length-capped and
   HTML-escaped before storage/broadcast.

## 6. Deployment Topology (Render)

```
Render Postgres (bhabhi-thulla-db)
        │  DATABASE_URL
        ▼
Render Web Service (bhabhi-thulla)
  build:  npm install && npm run build   (builds client, compiles server)
  start:  npm run start                  (node dist/server.js)
  serves: Socket.IO + REST + built client/dist as static files
```

Single service avoids cross-origin WS issues and fits Render's free tier
(one web service, one small Postgres). `render.yaml` captures this as
infrastructure-as-code so it's reproducible outside the MCP-driven deploy.

## 7. Rules Configuration

```ts
export const RULES = {
  minPlayers: 3,
  maxPlayers: 8,
  defaultMaxPlayers: 4,
  deckSize: 52,
  startingCard: "AS",
  requireFollowSuit: true,
  thullaEnabled: true,
  thullaEndsTrick: true,
  thullaWinnerGetsPile: true,
  normalTrickWinnerGetsPile: false,
  lastPlayerIsBhabhi: true,
  turnTimeLimitMs: 60_000,
  roomCodeLength: 4,
} as const;
```

Engine functions read from this object rather than hardcoding constants, so
a future rule change (e.g., different turn timer) doesn't require touching
UI or socket code.
