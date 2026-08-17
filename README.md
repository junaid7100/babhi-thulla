# Baavi Tulla — AI Strategy Assistant

A real-time, local-first strategy co-pilot for playing the card game **Baavi
Tulla** (Bhabhi Thulla) with friends. You track what's played on your phone;
the app maintains the full game state and tells you the strongest legal card
to play, with a plain-English explanation and confidence rating.

This is a companion tool, not a game to play against bots — the actual game
happens at the table. See [`RULES.md`](./RULES.md) for the exact ruleset the
engine implements and the assumptions it makes explicit rather than guesses.

## Architecture

The game engine (`src/game/`) is pure TypeScript with no React or browser
dependency, and is fully unit-tested in isolation:

- `cards/` — card/deck primitives
- `rules/` — the configurable `GameRules` abstraction (see RULES.md)
- `state/`, `actions/` — event-sourced `GameState`: undo and history edits
  both work by replaying an edited event log, never by patching state
- `validation/` — legal-move engine, trick evaluation, consistency checks
- `ledger/` — the global card ledger (every card's status)
- `inference/` — opponent hand inference (known/impossible/possible cards,
  probability estimates)
- `strategy/`, `simulation/` — the Monte Carlo recommendation engine
- `explain/` — turns a recommendation's computed features into prose

`src/store` (Zustand) is the single authoritative bridge between this engine
and the UI; `src/persistence` is an IndexedDB layer so games survive a
refresh; `src/workers` runs the simulation off the main thread.

## Development

```bash
npm install
npm run dev        # start the dev server
npm test           # Vitest unit/integration tests (game engine)
npm run build      # typecheck + production build
npm run test:e2e   # Playwright golden-path test (builds+previews first)
```

Use **Debug Mode** (Settings) to inspect raw state/ledger/inference/legal
moves, and **Load Demo Game** on the home screen for a scripted example that
exercises a clean trick, a Thulla pickup you win, and one an opponent wins.

## Deployment

Deployed to [Render](https://render.com) as a static site (this app is
local-first / client-only — no backend is required).
