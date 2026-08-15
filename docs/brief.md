# Project Brief — Bhabhi Thulla

*(BMAD-style brief — Analyst phase)*

## Problem / Opportunity

Junaid and a small group of friends want to play **Bhabhi Thulla** (a.k.a. Bhabhi, Thulla, Get Away) — a classic South Asian trick-taking card game — together online, from their phones, without installing an app or creating accounts.

## Target Users

One host + up to 4 friends (5 players total) on a shared game link. Casual, private use only — not a public product.

## Goals

1. Faithful, server-authoritative implementation of Bhabhi Thulla rules (see `docs/game-rules.md`).
2. Mobile-first UI styled as a cartoon "backyard card table" scene — matching a reference screenshot supplied by the user (wood table, grass/fence backdrop, circular player avatars with card-count badges, gold/purple winner ribbons for 1st/2nd place finishers).
3. Play with real friends or fill empty seats with bots so a game can start solo.
4. No database, no accounts — a room lives in server memory for the duration of a match.
5. Deployed and reachable over the internet (Render), so friends can join from anywhere.

## Non-Goals

Persistent stats/leaderboards, spectator mode beyond players who've already gone out, sound/animation beyond simple card transitions, host migration on disconnect, scaling beyond a handful of concurrent rooms.

## Success Criteria

A real user can create a room from their phone, share a 4-character code, get 3–5 players in, play a full game with correct rule enforcement (follow-suit, Thulla pickup, first-trick exception, escapes, Bhabhi), and see a result screen — all deployed live on Render.
