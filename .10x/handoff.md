# Handoff
Next: user reviews and merges the four PRs in order (foundation, users, tender data, vault). Then QA runs the
two-browser test on the office machine with real Ollama.

## Current Handoff (2026-10-18, SDE review fixes)
Code-quality fixes from reviews/2026-10-18-db-code-quality-review.md, plus a dev-only "Fill all with sample data"
button on the bid blanks panel. Read decisions/sde/db-review-and-sample-blanks.md. QA: with the vault unlocked,
the sample fill should also mark checklist lines as attached from the vault; with it locked, only [attach] blanks remain.

## Previous Handoff (2026-10-18, QA)
QA ran every write through the app on a fresh database, restarted the server and read it all back from new
browsers: 23/23 pass. Everything the office shares is in SQLite; the vault is there as ciphertext. One bug fixed
(Viewer bid page 403). Gaps: the NIT file itself is not kept. Read decisions/qa/local-database.md and
reviews/2026-10-18-qa-report.md. Release readiness: ready to merge once reviewed.

## Older Handoff (2026-10-18, build)
All four SDE branches are built and pass tests (143) plus a browser run across separate sessions: analyst
uploads, writer drafts, viewer reads but gets 403 on writes, admin turns the viewer off (next call 401), old
browser data imports with GSTIN/PAN scrubbed, the vault set up by the writer opens for the admin elsewhere and the
database holds no plaintext GSTIN/PAN. Deviations from the plan are under "As built" in
decisions/principal-architect/local-database.md. Not done: login rate limiting, CSRF tokens (security backlog).

## Older Handoff (2026-10-18, plan)
PM → Architect → CTO for the local database. Read, in order: decisions/product-manager/local-database.md,
decisions/principal-architect/local-database.md, adrs/004-sqlite-drizzle-local-db.md, decisions/cto/local-database.md.
Acceptance criteria are the six PM success criteria. Priority: SDE-1, then SDE-2/3 (P0) in parallel with SDE-4 (P1).

## History
- 2026-10-10: Fixed the last four #16 audit findings; see decisions/sde/audit-remaining-findings.md. QA: upload an
  empty .docx and a scanned PDF without OCR tools; both should show a clear message. Next: run with real Ollama on the user machine.
