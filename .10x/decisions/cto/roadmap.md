# CTO: what's next after PR #18 (2026-10-09)

## Context
Prototype is now runnable end to end (RBAC, analysis on Qwen, CPWD-style bids on Llama 3), but all data lives in each
browser's localStorage and nothing has run on real models yet.

## Priorities
**P0: before a real contractor uses it**
1. Validate on real Ollama (qwen2.5:3b-instruct, llama3): output quality, latency of 5 sequential Llama calls on CPU.
2. Server-side persistence + real users: RBAC is only meaningful when a Bid Writer's analysis is visible to the Viewer.
   Reports, bids, company profile and users move from localStorage to a DB.
3. CI (build + test) on PRs; repo has none.
4. Security: login rate limiting, CSRF token. (Path traversal in upload temp file fixed 2026-10-09.)

**P1: product value**
5. Structured extraction with Qwen: estimated cost, EMD, completion period, bid deadline, eligibility thresholds
   (similar works, turnover, solvency). Feeds the analysis header, bid capacity and checklist instead of placeholders.
6. BOQ extraction to a priceable Excel sheet (the financial bid is BOQ-driven).
7. Bid export as .docx on company letterhead (contractors print/sign/upload; Markdown is not usable for them).
8. Long generation: background job + progress instead of one multi-minute request.

**P2**
9. OCR for scanned tender PDFs (common for state PWD).
10. Remove fake UI: market ticker, subscription box, hardcoded date/location/division; Clauses/BOQ placeholder tabs.
11. Repo hygiene: root PHASE-*.md reports → docs/; fix 14 pre-existing lint errors.

## Open decision: persistence stack (depends on deployment target)
| Option | Fits | Cost |
|---|---|---|
| SQLite + Drizzle, single server next to Ollama (recommended if on-prem) | Local-first, data stays in the office, one box | Single-node; move to Postgres later via same ORM |
| Postgres + Auth.js | Multi-office / cloud GPU host | Needs DB hosting + provider setup |
| Supabase | Fastest hosted auth + DB | Tender data leaves premises; vendor lock-in |
