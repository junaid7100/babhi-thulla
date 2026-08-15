# Product Requirements — Bhabhi Thulla

*(BMAD-style PRD — PM phase, kept lean for a small private-use project)*

## Functional Requirements

**Lobby**
- FR1: Host creates a room, gets a 4-character room code, chooses "Play with Bots" (auto-seats up to 3 bots) or "Play with Friends" (waits for humans).
- FR2: Friends join via room code + display name.
- FR3: Host starts the game once ≥3 players are seated.
- FR4: Room auto-expires 15 minutes after creation.

**Gameplay**
- FR5: Server is sole authority on hand contents, turn order, legal moves, Thulla detection, and game end (see `docs/game-rules.md`).
- FR6: Client shows only the current player's own hand; opponents show card-back counts only.
- FR7: Legal cards are visually distinct from illegal ones during a player's turn.
- FR8: A player gets 30 seconds per turn; the server auto-plays a legal card if they don't act in time.
- FR9: Only a Thulla gets an on-screen banner; normal tricks resolve silently within ~500ms.
- FR10: A player who empties their hand ("escapes") switches to a spectating view for the rest of that match, with a ribbon showing their finish rank (1st/2nd/3rd) and a way to leave the table.
- FR11: Refreshing the browser mid-game restores the player's hand and turn state (session persisted in `localStorage`, `RECONNECT` socket event).

**Results**
- FR12: End-of-game screen shows the Bhabhi (loser), full finish order with ribbons, trick/Thulla counts, and (host-only) a "Play Again" rematch in the same room.

## UI Requirements (visual target)

Reference: user-supplied screenshot of a mobile "backyard" card table.

- Full-bleed grass/backyard scene backdrop with a picket-fence strip along the top edge.
- Central wood-plank table holding the current trick's face-up cards.
- Player seats arranged around the table (top / left / right / bottom-left for up to 4 opponents) as rounded-square avatar frames with a colored border, a yellow card-count badge, a small decorative card-back fan, and a name plate.
- Active player's avatar gets a gold pulsing ring.
- Players who've gone out get a gold/purple/bronze "1st/2nd/3rd Winner" ribbon on their avatar.
- Top-right chat and hamburger-menu icon buttons.
- Bottom status pill ("Your Turn" / "`<name>`'s turn" / "Spectating") and, for spectating players, a "Claim & Exit" button.
- Own hand fanned along the bottom edge, horizontally scrollable, large touch targets.

Implemented as CSS/SVG (`frontend/src/theme.jsx`) with optional image drop-in points (backyard background, card back, per-seat avatar art) — see README "Custom art" section for how to swap in real illustrations.

## Out of Scope (v1)

Persistent database, accounts/auth, stats beyond the current game, sound effects, animations beyond simple card transitions, host migration on disconnect, rate limiting, scaling beyond a handful of concurrent rooms.
