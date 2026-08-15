# Knowledge Source

This app grounds the assistant's recommendations in the actual text of
*$100M Leads* by Alex Hormozi, per `docs/prd.md` FR4.

The book is commercially licensed content and is **not included in this
repository**. To enable grounding:

1. Obtain your own lawful copy of *$100M Leads* as a PDF.
2. Place it at `knowledge/100m-leads.pdf` (this exact path is gitignored,
   so it will not be committed) — or set `LEADS_PDF_PATH` in `.env.local`
   to point at wherever you keep it.
3. Restart the dev server / redeploy.

If no file is present, the app still runs. The assistant is told at
runtime that the source document isn't attached and will say so rather
than fabricate quotes, statistics, or page numbers — see
`lib/system-prompt.ts`'s `NO_SOURCE_NOTE` and `docs/architecture.md` §5.
