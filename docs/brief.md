# Project Brief: $100M Leads AI Implementation Assistant

## Summary

A single-page web application that turns Alex Hormozi's *$100M Leads* into an
interactive, personalized implementation tool. The user picks one of 11
lead-generation outputs from a menu, answers a short set of targeted
questions, and receives an actionable, business-specific deliverable
(strategy, script, audit, plan, etc.) grounded in the book's frameworks.

## Problem

Reading the book gives principles; it doesn't hand the reader a plan for
*their* business. Users need a tool that (a) asks only the minimum
qualifying questions, (b) applies the book's frameworks (Core Four, lead
magnets, warm/cold outreach, paid acquisition, lead getters) to their
specific situation, and (c) outputs something they can execute today —
not a summary of chapters they've already read.

## Target Users

Solo founders, marketers, and small-business operators who own the book (or
have read it) and want a fast path from "I know the framework" to "here is
my plan."

## Core Product Behavior

The product is essentially a specialized chat agent. The intelligence lives
in the system prompt (persona, the 11-option menu, per-option interaction
rules and output structures, personalization rules, and grounding rules)
supplied by the product owner. The application's job is to:

1. Present the 11-option menu as the entry point.
2. Carry on a conversation, asking minimal clarifying questions per the
   selected option.
3. Ground every substantive recommendation in the actual text of
   *$100M Leads* by giving the model direct access to the source PDF
   rather than relying on paraphrase/memory.
4. Render the model's structured output (headings, tables, checklists)
   legibly.
5. Never fabricate quotes, page numbers, or statistics not present in the
   source.

## Explicit Non-Goals (v1)

- No user accounts, billing, or multi-tenant persistence — single-session,
  stateless-per-request (history lives in the browser tab).
- No admin CMS for editing the system prompt (it lives in source control).
- No vector database / chunked RAG pipeline — the source PDF is small
  enough to pass in full as a document input, which also avoids retrieval
  gaps ("PDF does not contain enough information" must be an honest
  judgment the model makes, not a symptom of bad chunking).

## Source Material Constraint

*$100M Leads* is commercially licensed, copyrighted content. This
repository does not include the book's text. The app expects the operator
to supply their own lawfully obtained copy as a local file
(`knowledge/100m-leads.pdf`, gitignored) or via an equivalent object-storage
path at deploy time. The app fails soft (tells the user grounding is
unavailable) rather than fabricating book content when the file is absent.
