# $100M Leads Assistant

An interactive AI implementation assistant built around Alex Hormozi's
*$100M Leads*. Presents the book's 11 personalized-output menu (lead
generation strategy, Core Four assessment, lead magnets, content strategy,
warm/cold outreach, paid advertising, lead getters, audit, 30-day plan) and
turns the book's frameworks into business-specific, actionable output —
grounded in the actual book text via direct PDF document input, not
paraphrase.

Built with the BMAD (planning-first) method — see `docs/brief.md`,
`docs/prd.md`, `docs/architecture.md`, and `docs/stories/stories.md` for
the goals, requirements, design decisions, and story breakdown behind this
implementation.

## Setup

```bash
npm install
cp .env.example .env.local   # then set ANTHROPIC_API_KEY
```

To ground responses in the real book text, supply your own lawfully
obtained PDF — see `knowledge/README.md`. The app runs without it, but
grounding degrades gracefully (the assistant will say when it can't verify
something against the source rather than invent it).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## How it works

- `lib/system-prompt.ts` — the assistant's full behavioral specification
  (persona, menu, per-option output structure, grounding rules). Single
  source of truth; update behavior here, not in route/UI code.
- `lib/knowledge.ts` — loads the source PDF from disk if present.
- `app/api/chat/route.ts` — streaming chat endpoint; attaches the PDF as a
  document input and the system prompt on every turn (both prompt-cached).
- `app/page.tsx` — the chat UI: the 11-option menu, a Markdown-rendered
  message thread, and streaming responses.

## Scripts

```bash
npm run dev     # local dev server
npm run build   # production build
npm run lint    # eslint
```

## Deploy

Any Next.js host works (e.g. Vercel). Set `ANTHROPIC_API_KEY` (and
optionally `ANTHROPIC_MODEL`, `LEADS_PDF_PATH`) as environment variables on
the platform; if the PDF isn't baked into the deploy image, point
`LEADS_PDF_PATH` at wherever it's mounted, or leave it unset to run without
grounding.
