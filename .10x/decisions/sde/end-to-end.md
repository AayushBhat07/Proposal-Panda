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

## Round 2 (2026-10-09, after user answers)
- Roles: Admin, BidWriter, TenderAnalyst, Viewer (Executive + Compliance Reviewer merged into Viewer: identical permissions).
- Removed Generate Tender page/API, the Llama chapter tender generator (features/ai-generation), unused tender-management, test-tenders.
- Models: Llama 3 (bids) + Qwen (analysis) only. BART naming and phi3/mock instruction model removed; compliance is rules (`modelUsed: 'rules'`). Ollama client moved to lib/llm/ollama.ts.
- Foundation bid follows CPWD two-bid format: Cover I (transmittal, checklist, declarations/affidavit, similar works + bid capacity 2·A·N−B, scope, methodology/work programme, compliance, pre-bid queries) and Cover II (percentage/item-rate proforma). Narrative = Llama, proformas = bidTemplates.ts. Reference: IIT Kanpur IWD CPWD-pattern NIT (Forms 5.1–5.13).

## Round 3 (2026-10-09, after first real Ollama run on M3 Pro)
Real run: analysis 32 s (qwen2.5:3b), bid 89 s (llama3), figures faithful, bid content unsafe. Fixes:
- NIT reference extracted from the document (`findNitReference`); internal tenderId never reaches the bid.
- New summary section "Eligibility and Key Clauses"; summaries 250 words and quote figures/specs exactly.
- Report keeps the first 10k chars of tender text; methodology, compliance and pre-bid queries see it.
- Prompts: bidder named, figures copied, programme in Month 1..N over the tender's completion period,
  no commitments beyond tender conditions, pre-bid queries skip what the tender already answers.
- Per-section fallback counted in modelUsed; Integrity Pact in checklist; force-majeure flag reworded.
