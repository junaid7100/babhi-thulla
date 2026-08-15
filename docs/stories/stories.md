# Stories (v1)

Story format: As a/I want/so that + acceptance criteria. Grouped by epic per
`docs/prd.md` §7.

## Epic 1 — Project Foundation

### Story 1.1 — Scaffold project
As the operator, I want a Next.js + TypeScript + Tailwind project so the
team has a standard, deployable base.
- [x] `create-next-app` scaffold committed (App Router, no `src/`).
- [x] `npm run build` succeeds on a clean checkout.

### Story 1.2 — SDK & config wiring
As the operator, I want the Anthropic SDK and env-driven config so the app
can call the model without hardcoded secrets.
- [x] `@anthropic-ai/sdk` installed.
- [x] `.env.example` documents `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`,
      `LEADS_PDF_PATH`.

## Epic 2 — Assistant Core

### Story 2.1 — Externalize system prompt
As the operator, I want the full behavioral spec in one source file so
updating assistant behavior never requires touching route/UI code.
- [x] `lib/system-prompt.ts` contains the spec verbatim.
- [x] Nothing outside this file encodes per-option question logic.

### Story 2.2 — Knowledge loader
As the assistant, I want direct access to the book PDF so recommendations
are grounded in the real text rather than paraphrase.
- [x] `lib/knowledge.ts` reads `knowledge/100m-leads.pdf` (or
      `LEADS_PDF_PATH`), base64-encodes, memoizes.
- [x] Returns `{available:false}` without throwing when the file is
      absent.

### Story 2.3 — Streaming chat endpoint
As the user, I want responses to stream so long outputs (e.g. "Generate
Everything") don't look hung.
- [x] `POST /api/chat` builds system + optional PDF document block (both
      `cache_control: ephemeral`) + full history.
- [x] Streams text deltas; Node runtime (needs `fs`/`Buffer`).
- [x] Non-2xx JSON error on missing key / upstream failure.

## Epic 3 — Chat UI

### Story 3.1 — Menu landing state
As a first-time user, I want the 11 options presented clearly so I can
start without reading instructions.
- [x] Menu grid renders before any message is sent.
- [x] Clicking an option sends it as a user turn verbatim; free-text input
      is also always available.

### Story 3.2 — Rendered thread
As a user, I want tables/headings/checklists to render properly so
outputs like the Core Four scoring table are actually legible.
- [x] Assistant messages render via `react-markdown` (tables/GFM enabled).
- [x] Assistant bubble updates live as tokens stream in.

### Story 3.3 — Session control & errors
As a user, I want to start over and to see failures explicitly.
- [x] "New conversation" clears history client-side.
- [x] Fetch/stream errors render as a visible error bubble, not a silent
      no-op.

## Epic 4 — Grounding & Safety

### Story 4.1 — Degrade gracefully
As the operator, I want the assistant to admit when it can't see the
source rather than invent quotes/pages.
- [x] When the PDF is absent, an additive system note instructs the model
      to say so instead of fabricating.

### Story 4.2 — No copyrighted content in the repo
As the operator, I don't want to ship the book's text in source control.
- [x] `knowledge/*.pdf` gitignored; `knowledge/README.md` explains how to
      supply the file locally/at deploy time.
