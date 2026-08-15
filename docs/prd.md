# Product Requirements Document — Bhabhi Thulla

_Method: BMAD (Breakthrough Method for Agile AI-Driven Development) — Planning Phase_
_Status: Approved for build_

## 1. Goal

Ship a real, production-quality, browser-based multiplayer implementation of the
Bhabhi Thulla card game. Server-authoritative rules, private hands, real-time
sync over WebSockets, persistent state in PostgreSQL, reconnection support, and
a polished mobile-first UI. No mockups, no fake multiplayer, no client-trusted
game logic.

## 2. Users

- A host who creates a room from their phone or desktop and invites 2–7 friends.
- Joining players who enter a room code and a display name — no account required.

## 3. Core Game Rules (canonical for v1)

- Standard 52-card deck, no jokers, no trump suit. Ranking A(14) > K > Q > J > 10 > … > 2.
- 3–8 players per room, host-configured max (default 4), minimum 3 to start.
- Deal all cards as evenly as possible (some players get one extra card).
- The holder of A♠ leads the first trick and must lead with A♠.
- Every trick: the leader plays any legal card, setting the lead suit. Each other
  active player must follow suit if able; if unable, they may play any card.
- Playing off-suit while holding the lead suit is illegal and rejected server-side.
- Playing off-suit while holding none of the lead suit is a **Thulla**: the trick
  ends immediately, remaining players do not play, and the highest card of the
  original lead suit wins the *entire* trick pile into their hand.
- If everyone follows suit, the highest lead-suit card wins the trick; the trick
  is discarded (does not return to any hand); winner leads next.
- A player whose hand reaches zero cards escapes immediately, is recorded with a
  finish position, and takes no further part (including as a Thulla pickup target).
- When one active player remains, that player is the **Bhabhi** (loser). Game ends.

These rules are implemented as data (`RULES` config, see architecture doc) and
as pure, unit-tested functions — never duplicated in the UI.

## 4. Functional Requirements

### Lobby & Rooms
- Create room (display name, max players 3–8, default 4) → 4-character room code
  (uppercase, excludes O/0/I/1).
- Join room by code; join is rejected once the game has started or the room is full.
- Leave room; host privileges migrate deterministically (earliest-joined remaining
  player) if the host leaves or disconnects permanently.
- Copy-room-code affordance.
- Host starts the game (blocked below 3 players); player list locks on start.

### Gameplay
- Server deals, tracks turn order, validates every play, detects Thulla, resolves
  tricks, tracks escapes, and determines the Bhabhi. Client never decides any of
  these — it only requests `playCard(cardId)`.
- Players see only their own hand; opponents are shown as name + card count +
  connection + turn state.
- Legal cards are highlighted client-side for UX only; the server re-validates
  independently and rejects illegal requests with a clear error.

### Reconnection & Resilience
- Player identity (UUID) persists in `localStorage` and in Postgres. A refresh or
  temporary disconnect restores the player's seat, hand, and the live table state.
- Disconnected players are shown as "disconnected", not removed. A 60-second
  turn timer auto-plays a random legal card for a player who doesn't act in time
  (configurable), so the table is never blocked indefinitely.
- Host disconnect does not end the game; host duties transfer per the deterministic
  rule above and clients are notified.

### End of Game
- Results screen: Bhabhi, escape order, tricks played, Thulla count, game duration.
- Play Again (fresh shuffle, same room/players) and Return to Lobby.

### Security / Anti-cheat
- All mutations are server-validated. Private hands never leave the owning
  player's socket channel. Postgres access to hand contents is scoped to the
  backend service role only (no client-side DB access).
- Rate limiting on socket actions; duplicate/replayed card plays rejected;
  turn-order race conditions resolved by a per-room in-memory mutex plus
  optimistic version check against persisted state.

## 5. Non-functional Requirements

- Mobile-first responsive UI, 320px+ widths, no horizontal overflow, touch targets ≥40px.
- Dark, elegant card-table aesthetic; readable cards; accessible contrast; status
  communicated via icon/text, not color alone.
- Automated tests for the game engine (deck integrity, dealing, follow-suit,
  Thulla, normal trick, escape, end game, concurrency).
- Deployed and reachable on the public internet via Render (web service + managed
  Postgres).

## 6. Explicitly Out of Scope for v1

Persistent player accounts/auth, cross-game leaderboards, spectators (backend is
structured to allow it later), matchmaking, jokers/trump/house-rule variants.

## 7. Priorities

1. Real multiplayer core: rooms, dealing, private hands, turns, follow-suit,
   Thulla, pickup/discard, escape, Bhabhi, rematch.
2. Reconnection, host migration, per-game statistics, animations/sound, turn timer.
3. Anything beyond that (accounts, leaderboards, spectators) — nice-to-have, not blocking.
