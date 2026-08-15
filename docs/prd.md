# Product Requirements Document: $100M Leads AI Implementation Assistant

## 1. Goals

- Let a user go from "landed on the page" to "personalized, actionable
  lead-gen output" in one conversation.
- Ground every book-derived claim in the actual PDF text, not paraphrase.
- Keep the interaction minimal-question, not a 20-question intake form.
- Make it trivial for the operator to update the assistant's behavior by
  editing one system-prompt source file — no prompt logic duplicated in UI
  code.

## 2. Background

The product owner supplied a complete behavioral specification for the
assistant: role, the 11-option main menu, interaction rules, information to
collect, an output philosophy, and a fully specified output structure for
each of the 11 options (see `lib/system-prompt.ts`, which is the PRD's
source of truth for assistant behavior — this document governs the
*application* built around it, not the prompt content itself). That
specification is treated as fixed input, not something this PRD
re-derives.

## 3. Users & Use Case

Single user, single session, browser-based chat. No login. The user selects
a menu option (by clicking or typing), the assistant asks clarifying
questions inline, and the assistant's structured output renders in the
chat thread.

## 4. Functional Requirements

**FR1 — Menu entry point.** On load, the app greets the user and displays
the 11 options (Lead Generation Strategy, Core Four Assessment, Lead Magnet
Generator, Content Strategy, Warm Outreach System, Cold Outreach System,
Paid Advertising Strategy, Lead Getter System, Lead Generation Audit,
30-Day Plan, Generate Everything) as clickable choices, in addition to free
text entry.

**FR2 — Conversational flow.** Selecting an option (click or typed number)
sends it as a user turn. The assistant drives all subsequent
question-asking and output generation per its system prompt; the app does
not hardcode per-option question logic.

**FR3 — Multi-turn history.** The full conversation (both roles) is sent
with each request so the assistant has context for follow-up turns
(qualification answers, "where does this come from?", refinement asks).

**FR4 — Book grounding via direct document access.** Every request to the
model includes the source PDF as a document content block (when present on
the server) so the model can cite/ground claims in the real text, per the
"Book Grounding" section of the spec. This replaces any need for the model
to rely on trained-in knowledge of the book.

**FR5 — Graceful degradation without the source file.** If the operator
has not provided `knowledge/100m-leads.pdf`, the app still functions, but
informs the model (via a system-prompt note) that the source document is
unavailable, so it can honestly say so rather than fabricate quotes/page
numbers — consistent with the spec's explicit prohibition on fabrication.

**FR6 — Structured rendering.** Assistant responses use Markdown
(headings, tables, bold, lists); the UI renders this, not raw text, so
tables (e.g. the Core Four scoring table) are legible.

**FR7 — Streaming responses.** Long, structured outputs (e.g. "Generate
Everything") can be slow to produce in full; the app streams tokens so the
user sees progress rather than a long blank wait.

**FR8 — Reset / new session.** The user can start a new conversation
without reloading the page.

**FR9 — Error handling.** Missing API key, model error, or oversized PDF
attachment produce a visible, specific error in the chat UI, not a silent
failure.

## 5. Non-Functional Requirements

**NFR1 — No secrets in the client.** The Anthropic API key is read
server-side only (`ANTHROPIC_API_KEY` env var); the browser never sees it.

**NFR2 — Cost control on repeated large context.** Because the system
prompt and the full PDF are resent on every turn, both are marked for
prompt caching (`cache_control: ephemeral`) so multi-turn conversations
don't reprocess/re-bill the same tokens every turn.

**NFR3 — Config, not hardcoding.** Model ID is an env var
(`ANTHROPIC_MODEL`) with a sane default, not hardcoded in route logic.

**NFR4 — No copyrighted content committed.** The actual PDF is gitignored;
only a placeholder/README describing how to supply it is committed.

## 6. Out of Scope (v1)

Accounts, persistence across sessions/devices, analytics, PDF chunking/RAG,
prompt editing UI, multi-language support. See `docs/brief.md` §Non-Goals.

## 7. Epics & Stories

### Epic 1 — Project Foundation
- **1.1** Scaffold Next.js (App Router, TypeScript, Tailwind) project.
- **1.2** Wire `@anthropic-ai/sdk`, env var handling, `.env.example`.

### Epic 2 — Assistant Core
- **2.1** Externalize the full behavioral spec as `lib/system-prompt.ts`
  (single source of truth, verbatim from product owner).
- **2.2** Knowledge-loader module (`lib/knowledge.ts`) that reads the PDF
  from disk if present, base64-encodes it, and reports availability.
- **2.3** `/api/chat` route: builds the message array (system prompt +
  optional PDF document block, both cache-tagged) + conversation history,
  streams the model's reply back to the client.

### Epic 3 — Chat UI
- **3.1** Landing state with the 11-option menu grid + free-text input.
- **3.2** Message thread with Markdown rendering, streaming updates, and
  role-distinct bubbles.
- **3.3** New-session control, in-flight/error states.

### Epic 4 — Grounding & Safety
- **4.1** Degrade-gracefully messaging when the source PDF is absent.
- **4.2** Verify no book text is committed to the repo; document the setup
  step for operators.

## 8. Acceptance Criteria (v1 "done")

- Loading the app shows the menu from FR1.
- Clicking any option produces a model-driven follow-up (question or
  output) without app code branching per option.
- With a PDF present at `knowledge/100m-leads.pdf`, the model has it
  available as a document input on every turn.
- Without the PDF present, the app still runs and the assistant is told
  the source is unavailable.
- `npm run build` and `npm run lint` pass cleanly.
