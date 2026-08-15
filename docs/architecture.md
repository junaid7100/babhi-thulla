# Architecture: $100M Leads AI Implementation Assistant

## 1. Stack

- **Next.js 15 (App Router) + React 19 + TypeScript** — single deployable,
  server routes co-located with the UI, no separate backend to stand up.
- **Tailwind CSS** — utility styling for the chat UI.
- **`@anthropic-ai/sdk`** — official client for the Messages API, used for
  streaming and for PDF document content blocks.
- **`react-markdown`** — renders the model's Markdown output (tables,
  headings, checklists) instead of dumping raw text.

No database, no auth, no queue. State is the browser tab's memory
(`useState` message array) plus whatever the model infers from the
conversation history resent each turn.

## 2. Request Flow

```
Browser (app/page.tsx)
  -> POST /api/chat { messages: [{role, content}, ...] }
Server (app/api/chat/route.ts)
  -> load system prompt (lib/system-prompt.ts)
  -> load PDF if present (lib/knowledge.ts), base64
  -> anthropic.messages.stream({
       model, system: [system-prompt block, cache_control],
       messages: [ {role:"user", content:[pdf-document-block (cache_control), text]}
                    ...rest of history ]
     })
  -> pipe text deltas back as a streamed HTTP response
Browser
  -> appends streamed tokens to the last assistant message live
```

## 3. System Prompt

`lib/system-prompt.ts` exports `SYSTEM_PROMPT: string` — the full
behavioral specification supplied by the product owner (persona, the
11-option menu, per-option interaction rules, output structures,
personalization rules, grounding rules, output style), copied verbatim.
This is intentionally **not** re-derived or paraphrased by application
code: the PRD explicitly treats it as fixed input. Any future change to
assistant behavior is a change to this one file, not to route or UI code.

A short, environment-driven addendum is appended at request time (not
hardcoded in the file) to tell the model whether the source PDF is
attached this turn — see §5.

## 4. PDF Grounding (FR4)

The spec requires the assistant to treat the book PDF as its primary
source of truth and to avoid fabricating quotes/page numbers. Two ways to
satisfy "the model has read the book":

1. **Chunk + embed + retrieve (RAG).** Rejected for v1: retrieval quality
   depends on chunking strategy, and a bad retrieval turns "the PDF doesn't
   cover this" into a silent gap rather than an honest answer.
2. **Attach the full PDF as a document input on every call.** Chosen.
   *$100M Leads* is a normal-length business book — small enough that
   Claude's native PDF document support (an image+text content block) can
   take the whole thing per request, so the model reasons over actual
   pages rather than a paraphrase. Simpler, and failure mode is "model says
   it doesn't see something" rather than "retrieval silently dropped it."

Trade-off accepted: every request re-sends the PDF's tokens. Mitigated via
prompt caching (§6). If the book were long enough to blow the context
window this would need revisiting (chunked retrieval), but it isn't.

`lib/knowledge.ts`:
- Looks for `knowledge/100m-leads.pdf` (path overridable via
  `LEADS_PDF_PATH` env var) at request time.
- Returns `{ available: boolean, base64?: string }`, memoized per server
  process (the file doesn't change at runtime) so disk I/O and
  base64-encoding happen once, not per request.
- Never throws if the file is missing — grounding degrades per FR5/FR6.

## 5. Graceful Degradation (FR5)

If `knowledge.ts` reports unavailable, `/api/chat` appends a short system
note: *"The source PDF is not attached to this session. If asked something
that depends on the book's exact text, statistics, or quotes, say the
source isn't available rather than guessing."* This is additive to the
fixed system prompt, not a replacement — the persona and menu behavior are
unaffected.

## 6. Prompt Caching (NFR2)

Both the system prompt block and the PDF document block carry
`cache_control: { type: "ephemeral" }`. Anthropic's prompt caching means a
multi-turn conversation (menu pick → clarifying answers → output → "where
does this come from?" follow-up) only pays full input-token cost on the
first turn; subsequent turns in the same conversation hit the cache for
the unchanged prefix (system + PDF). This is what makes "resend full
history + full PDF every turn" viable instead of needing session-side
state on the server.

## 7. API Route Contract

`POST /api/chat`
- Body: `{ messages: { role: "user" | "assistant"; content: string }[] }`
- Response: `text/plain; charset=utf-8` streamed body (raw token deltas).
  The client reads via `ReadableStream` and appends to the in-progress
  assistant message. Kept deliberately plain (no SSE/event framing) since
  there's exactly one producer and one consumer and no need for
  multiplexed event types yet.
- Runtime: Node.js (not Edge) — required for `fs` access to the PDF and
  for `Buffer`.
- Errors: non-2xx with a JSON `{ error: string }` body when
  `ANTHROPIC_API_KEY` is missing or the upstream call fails; the client
  surfaces this as a visible chat-thread error bubble (FR9).

## 8. Configuration

| Env var | Required | Default | Purpose |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | yes | — | Server-side only; never sent to the client. |
| `ANTHROPIC_MODEL` | no | `claude-sonnet-5` | Overridable per NFR3 without a code change. |
| `LEADS_PDF_PATH` | no | `knowledge/100m-leads.pdf` | Lets an operator point at a mounted/deploy-time path instead of committing the file. |

## 9. Directory Layout

```
app/
  page.tsx              # chat UI (client component)
  layout.tsx            # root layout (generated)
  api/chat/route.ts      # streaming chat endpoint
lib/
  system-prompt.ts       # fixed behavioral spec (source of truth)
  knowledge.ts            # PDF loader/cache
  types.ts                # shared Message type
knowledge/
  100m-leads.pdf          # gitignored; operator-supplied
  README.md                # how to supply it
docs/
  brief.md, prd.md, architecture.md, stories/
```

## 10. Non-Goals Reflected in Design

No server-side session store: history lives in the client and is resent,
which is why caching (§6) matters. No admin UI for the prompt: it's a
source file, versioned like code, reviewed like code. No multi-tenant
anything: single operator, single API key, single knowledge file.
