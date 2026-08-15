# Bhabhi Thulla

## Versioning convention

`frontend/src/version.js` exports `BUILD_NUMBER`, shown as `v{BUILD_NUMBER}` in the
bottom-left corner of the app (see `App.jsx`) so the user can visually confirm a
deploy picked up the latest changes. **Increment `BUILD_NUMBER` on every commit that
changes frontend or backend code**, before pushing.

## Planning docs

`docs/brief.md`, `docs/prd.md`, `docs/architecture.md` — kept lean, update them when
scope or design actually changes rather than treating them as a one-time artifact.
`docs/game-rules.md` is the cited, canonical rules reference; `backend/gameEngine.js`
must match it exactly.

## Visual theme

All shared colors, backyard-scene CSS, wood-panel/button styles, and small inline-SVG
icons live in `frontend/src/theme.jsx` (not `.js` — it contains JSX). Reuse tokens from
there rather than inlining new colors in components, so the table/lobby/results screens
stay visually consistent. Optional real-art drop-in points are documented in the root
`README.md` ("Visual style / custom art").
