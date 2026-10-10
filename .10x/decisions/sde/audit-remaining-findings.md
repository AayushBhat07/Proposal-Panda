# SDE: remaining audit findings from #16 (2026-10-10)

## Built
- 11: `/api/intelligence/run` checks `file instanceof File` and non-blank string metadata (400). 500s return a generic message; internal errors stay in the server log. `/api/bid/generate` returns `details` only for `BidModelUnavailableError` (503).
- 19: `UnreadableDocumentError` (textExtractor) for empty .docx, scanned/unreadable PDFs and blank text in the summarizer; the route maps it to 422 with the message. The orchestrator rethrows it unwrapped. `splitIntoChunks` drops empty words and always moves forward.
- 13: dashboard stops with an error when `saveToLocalStorage` returns false.
- 20: next and eslint-config-next 16.1.1 → 16.3.8, `npm audit fix`. 23 → 8 entries, 0 critical.

## Debt
- Remaining audit entries have no non-breaking fix: braces/micromatch/fast-glob via eslint-config-next (lint-time only), sprintf-js/argparse via mammoth (CLI parsing, not used by `extractRawText`).

## Verified
- Typecheck, build, 74/74 tests. Production build with `scripts/mock-ollama.mjs` (real Ollama unreachable from the sandbox): PDF upload → analysis page; empty .docx → 422 message in the UI; blocked storage → save error, stays on dashboard; curl text-field upload → 400.
