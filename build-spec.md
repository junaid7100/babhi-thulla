# Build Spec: Bhabhi Thulla — Multiplayer Card Game

## 0. Context and Scope

This is a **casual multiplayer card game for one host + up to 4 friends (5 players total)**, played from mobile phones. It is NOT a production SaaS product. Explicitly do not add: user accounts, persistent databases, leaderboards, spectators, or anything beyond what's listed below. Keep it small, fast, and correct.

Two deployable pieces, both hosted on **Render** (one account, two services):
1. **Backend** — Node.js + Socket.io WebSocket server. Render "Web Service." Holds all game state in memory (no database).
2. **Frontend** — React app. Render "Static Site." Talks to the backend over WebSockets.

A prototype of the rules engine and UI already exists (attached separately as `bhabhi-thulla.jsx`) — reuse its visual design, card component, color palette, and rules logic as the starting point. Port the rules engine to the backend as the source of truth; the frontend becomes a thin client that renders server state and sends move requests.

---

## 1. Game Rules (canonical, do not deviate)

- Standard 52-card deck, no jokers, no trump suit.
- Ranking within a suit: A > K > Q > J > 10 > 9 > 8 > 7 > 6 > 5 > 4 > 3 > 2.
- 3–5 players supported this session; design for up to 8 but default lobby cap is 5.
- Deal all cards as evenly as possible; some players may get one extra card.
- The player holding A♠ starts the game and must lead with A♠.
- **First trick only**: if a player has no spade and plays off-suit, that's technically a Thulla, but the first trick is always discarded, never picked up — the A♠ player never picks up the first trick.
- **Every trick after that**: the lead player plays any card, setting the lead suit. Each other active player must follow suit if they have a card of that suit; if they don't, they may play anything.
- **Thulla**: playing off-suit when you DO have the lead suit is illegal and must be rejected by the server. Playing off-suit because you have NO card of the lead suit is a valid Thulla — it immediately ends the trick. Remaining players do not get to play.
- **Thulla resolution**: the highest card of the original lead suit in the trick wins. That winner picks up every card in the trick into their hand (not just the lead-suit cards — everything played so far in that trick). Winner leads the next trick.
- **Normal trick (no Thulla, everyone followed suit)**: highest card of the lead suit wins. All cards in that trick go to a discard pile (removed from play, do not go to anyone's hand). Winner leads next trick.
- **Escape**: the instant a player's hand reaches 0 cards, they escape — removed from active rotation, recorded with a finish position, cannot receive cards later (this matters for Thulla pickups: an escaped player is never a legal Thulla winner).
- **Bhabhi**: when only one active player remains, that player is the Bhabhi (loser). Game ends.

## 2. UI Behavior — Explicit Requirements From Product Owner

These were specifically requested and must not regress:

- **Hand sort order**: Diamonds, Clubs, Hearts, Spades — in that exact suit order. Within each suit, high to low (A, K, Q, J, 10...2). Re-sort after every card is added or removed from hand.
- **No "trick winner" UI at all.** Do not show "X wins the trick," do not show a discard/winner animation or banner for normal tricks. Normal tricks resolve silently and quickly — clear the table to the next trick within roughly 400–600ms, just long enough to see the last card land.
- **Only Thulla gets a banner.** Show a clear "THULLA!" notification stating who had no [suit] and who takes the pile, sized for a phone screen, auto-dismissing after ~1.5s before the next trick begins.
- Legal cards are visually distinguishable from illegal ones during the player's turn (illegal = faded/disabled). Before your turn, cards are inert.
- Turn indicator must be unambiguous: "YOUR TURN" for the active human player; opponent avatars get a highlighted ring when it's their turn.
- Mobile-first: player's own hand pinned to bottom of viewport, horizontally scrollable/overlapping if many cards, large touch targets, no hover-dependent interactions.
- Reuse the existing prototype's visual language: dark elegant card-table background, warm terracotta accent (#D97757), physical-card-styled rank/suit on a light card face, Georgia/serif for display text.

## 3. Architecture

```
/backend
  server.js            — Express + Socket.io bootstrap
  gameEngine.js         — pure functions: deck, deal, validateMove, resolveTrick, etc. (NO socket/IO code in here — must be unit-testable standalone)
  gameEngine.test.js    — automated tests (see section 7)
  rooms.js              — in-memory room/game state manager (Map of roomCode -> gameState)
  socketHandlers.js      — socket.io event wiring, calls into gameEngine + rooms
  package.json
/frontend
  src/
    App.jsx
    socket.js            — socket.io-client connection singleton
    components/
      Lobby.jsx
      GameTable.jsx
      PlayingCard.jsx
      OpponentSeat.jsx
      ThullaBanner.jsx
      GameOverPanel.jsx
    hooks/
      useGameState.js    — subscribes to socket events, exposes current player-specific view
  package.json
  vite.config.js         — use Vite for fast dev/build
build-spec.md            — this file
README.md                — setup + deploy instructions (see section 9)
```

**Server authority is non-negotiable.** The client only ever sends "I want to play card X." The server (gameEngine.js + socketHandlers.js) is the sole source of truth for: whose turn it is, hand contents, legal moves, Thulla detection, trick resolution, escapes, and game end. Never trust or apply any game-state mutation requested by a client without server-side validation.

## 4. Backend — State Model (in-memory, no database)

```js
// rooms.js keeps: Map<roomCode, GameRoom>

GameRoom = {
  roomCode: string,          // e.g. "K7PX" — uppercase, no O/0/I/1
  status: "LOBBY" | "PLAYING" | "FINISHED",
  hostPlayerId: string,
  maxPlayers: number,        // default 5
  players: [
    {
      id: string,             // server-generated UUID, stable across reconnects
      displayName: string,
      seat: number,
      connected: boolean,
      socketId: string | null,
      hand: Card[],           // NEVER sent to other players
      escaped: boolean,
      escapedAt: number | null,   // order, 1-indexed
    }
  ],
  currentTrick: [{ playerId, card }],
  leadSuit: string | null,
  currentPlayerId: string,
  firstTrick: boolean,
  trickCount: number,
  thullaCount: number,
  createdAt: timestamp,
  startedAt: timestamp | null,
}

Card = { id: string, suit: "S"|"H"|"D"|"C", rank: string, value: number }
```

Room codes: 4 characters, uppercase letters + digits, excluding O, 0, I, 1 for readability. Regenerate on collision.

## 5. Backend — Socket Events

**Client → Server**
- `CREATE_ROOM` `{ displayName, maxPlayers }` → creates room, returns roomCode, joins as host
- `JOIN_ROOM` `{ roomCode, displayName }` → validates room exists, not full, not started; joins
- `START_GAME` `{ roomCode }` → host only, requires ≥3 players; deals cards, sets state to PLAYING
- `PLAY_CARD` `{ roomCode, cardId }` → validated server-side against full rules; rejected with error if illegal
- `LEAVE_ROOM` `{ roomCode }`
- `RECONNECT` `{ roomCode, playerId }` → restores socket association to existing player, resends their private state

**Server → Client**
- `ROOM_UPDATED` — public lobby state (players, host, count, maxPlayers)
- `GAME_STARTED` — initial deal notification
- `STATE_UPDATE` — the player-specific game view, sent to each player individually after any state change (see section 6 for shape)
- `THULLA` `{ offenderName, offenderSuitMissing, winnerName, pileSize }` — fired only on Thulla, frontend shows the banner
- `PLAYER_ESCAPED` `{ playerId, displayName, finishPosition }`
- `PLAYER_DISCONNECTED` / `PLAYER_RECONNECTED` `{ playerId, displayName }`
- `GAME_FINISHED` `{ bhabhiPlayerId, bhabhiName, escapeOrder, trickCount, thullaCount }`
- `ERROR` `{ message }` — human-readable, e.g. "It's not your turn.", "You must follow Diamonds.", "The room is full."

## 6. Player-Specific State View

Never broadcast raw game state. On every change, construct and emit a per-player view:

```js
// what player X receives
{
  roomCode, status,
  you: { id, hand: [...], /* their real cards */ },
  players: [
    { id, displayName, seat, cardCount, connected, escaped, isCurrentTurn }
    // NOTE: no `hand` field for anyone except `you`
  ],
  currentTrick: [{ playerId, displayName, card }],  // trick cards are public once played
  leadSuit,
  currentPlayerId,
  trickCount,
  thullaCount,
}
```

Other players' hand contents must never appear anywhere in the payload sent to a given socket.

## 7. Game Engine — Required Unit Tests (gameEngine.test.js)

Use a lightweight test runner (`node --test` or `vitest`, no need for a heavy framework).

- Deck: exactly 52 cards, no duplicate ids, all 4 suits × 13 ranks present.
- Dealing: all 52 cards distributed, no duplicates, no cards lost, correct near-even distribution for 3/4/5 players.
- First player: player holding A♠ is correctly identified; A♠ must be the first legal card played.
- Follow-suit: player holding the lead suit cannot play off-suit (rejected); player without the lead suit can play anything.
- Thulla detection: off-suit play with zero cards of lead suit ends the trick immediately; remaining players are not asked to play.
- Thulla resolution: highest lead-suit card wins; winner's hand grows by exactly the trick size; non-winners' hands don't change.
- First-trick exception: a Thulla on the very first trick still discards the pile, does NOT get picked up by anyone.
- Normal trick: highest lead-suit card wins the lead only; all trick cards vanish into discard, no one's hand grows.
- Escape: hand reaching 0 immediately marks escaped; escaped player is skipped in turn rotation and can never be dealt/receive cards again.
- End game: exactly one active player remaining ends the game; that player is recorded as Bhabhi.
- Illegal move rejection: playing a card not in hand, playing out of turn, and playing after escaping must all be rejected with no state mutation.

## 8. Frontend Requirements

- Vite + React, single WebSocket connection managed via `socket.js`, reused across components.
- Screens: Home (create/join) → Lobby (room code, player list, start button for host) → Game Table → Results.
- Lobby: display room code prominently with a "Copy Room Code" button; show live player list as people join; disable Start until ≥3 players; show "Waiting for at least 3 players..." below that threshold.
- Game Table: opponents arranged around the top/sides showing name, avatar initial, card count, connection status, turn highlight. Player's own hand at the bottom, sorted per section 2. Center area shows only the current trick's cards while a trick is in progress — no winner text, no discard animation, just clear it after ~500ms.
- Thulla banner: full-width toast/modal per section 2, dismisses on its own.
- Results screen: Bhabhi name, escape order list, trick count, Thulla count, "Play Again" button (host-only, resets and re-deals in the same room) and "Copy Room Code" for a rematch.
- Handle `ERROR` events with a lightweight toast, not a crash.
- On page load, check localStorage for a saved `{roomCode, playerId}` pair and attempt `RECONNECT` automatically before falling back to the Home screen — this covers refresh and reconnect scenarios for players on mobile Safari/Chrome.

## 9. Deployment — Render (both services, one account)

Provide a `README.md` with:

1. **Backend as a Render Web Service**
   - Root directory: `/backend`
   - Build command: `npm install`
   - Start command: `node server.js`
   - Environment variable: `PORT` (Render sets this automatically; server must read `process.env.PORT`)
   - Note: free tier spins down after 15 min idle — first connection after idle may take 30-60s to wake up. This is expected and fine for casual use.
   - Enable CORS on the Express/Socket.io server for the frontend's Render static site URL.

2. **Frontend as a Render Static Site**
   - Root directory: `/frontend`
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Environment variable: `VITE_SOCKET_URL` set to the deployed backend's Render URL (e.g. `https://bhabhi-thulla-backend.onrender.com`)

3. Step-by-step: push to GitHub → create both services in Render dashboard pointing at the same repo (different root directories) → set the frontend's `VITE_SOCKET_URL` after the backend URL is known → redeploy frontend.

4. How to test locally before deploying: run backend on `localhost:3001`, frontend on `localhost:5173` with `VITE_SOCKET_URL=http://localhost:3001`, open multiple browser tabs/windows to simulate multiple players.

## 10. Explicitly Out of Scope

Do not implement unless asked later: persistent database, user accounts/auth, statistics beyond the single current game, spectators, sound effects, animations beyond simple card transitions, host migration on disconnect (for v1, if the host disconnects, just let any active game continue — host controls simply become unavailable until they reconnect), rate limiting, multiple simultaneous rooms scaling concerns beyond a handful of concurrent games.

## 11. Definition of Done

- A real user can create a room from their phone and get a shareable 4-character room code.
- Up to 4 friends can join that room from their own phones over the internet (not localhost).
- The host can start with 3–5 players.
- Cards are genuinely shuffled server-side; each player sees only their own hand.
- Turn order, follow-suit validation, Thulla detection/pickup, first-trick discard exception, escapes, and Bhabhi are all enforced server-side and match section 1 exactly.
- Hands are sorted Diamonds → Clubs → Hearts → Spades, high to low within suit.
- No UI element announces a normal trick's winner; only Thulla shows a banner.
- Refreshing the browser mid-game restores the player's hand and turn state.
- `npm test` in `/backend` passes all tests from section 7.
- Both services are deployed and playable end-to-end on Render.
