# SDE: end-to-end (2026-10-09)

## Built
- `lib/auth/{rbac,session,users,server}.ts`, `proxy.ts`, `/api/auth/{login,logout,me}`; auth store reads the session from the server.
- Removed: `middleware.ts`, mock auth service, both RoleSelectors, unused `components/layout/Header.tsx`, mock intelligence report.
- Onboarding is company → review; role comes from the session.
- Dashboard upload calls `/api/intelligence/run`; recent activity lists real reports.
- PDF extraction (`unpdf`); `mammoth` moved to dependencies.
- Summaries via Ollama (`OLLAMA_ANALYSIS_MODEL`), extractive fallback flagged as `modelUsed: 'extractive-fallback'`.
- Summary and Compliance tabs render real data (previously hardcoded copy).
- `features/bid-generation` + `/api/bid/generate` + `/tenders/[id]/bid`.
- `scripts/mock-ollama.mjs`, `.env.example`, `tests/auth.test.ts`.

## Deviations / debt
- Compliance scoring is still rule-based over the summary text (unchanged); its category levels can read "Low" while listing risks.
- Generated tender route (`/api/tender/generate`) still returns template data; only its build error and auth were fixed.
- `useTenderGenerationOrchestrator` (Llama chapter generator) remains unused.
- Pre-existing lint errors untouched.
