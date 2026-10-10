# End-to-end: RBAC, tender analysis, foundation bid

**Date:** 2026-10-09 · **Requested by:** aayush

## Goal
Contractor signs in → uploads a tender (PDF/DOCX) → the tender is analysed on local models → a
foundation bid is generated from the analysis on a local model. RBAC decides who can do each step.

## State found [DISCOVERED]
- Next.js 16 App Router, client-only state in localStorage, zustand auth store.
- Two unrelated role lists (auth: Admin/BidWriter/Reviewer/Executive/ExternalConsultant;
  onboarding: Senior Tender Analyst/Bid Writer/Legal Compliance Officer/Executive). No checks anywhere.
- `initializeAuth()` auto-creates a BidWriter user, so every visitor is "logged in".
- Dashboard upload saves a hardcoded mock report; `/api/intelligence/run` is never called.
- Text extraction supports .docx only. BART and Qwen calls are mocks; compliance scoring is rule-based.
- `/api/tender/generate` returns hardcoded data and fails `next build` (type error).
- Llama-3 Ollama client exists (`localLlmService.ts`) but nothing in the UI uses it. No bid generation.

## Design (defaults, pending user answers)
1. **One role model** in `lib/auth/rbac.ts`, shared by server and client:
   Admin, TenderAnalyst, BidWriter, ComplianceReviewer, Executive.
2. **Server-authoritative session**: demo user directory (one user per role), login via
   `/api/auth/login` sets an HMAC-signed HttpOnly cookie. Role comes from the server, never the client.
3. **Enforcement**: `proxy.ts` (Next 16 replacement for middleware) redirects anonymous page
   requests to /login and blocks pages/APIs whose permission the role lacks; each API route also
   checks with `requirePermission()`. UI hides what the role can't do.
4. **Analysis**: dashboard posts the file to `/api/intelligence/run`; PDF extraction added.
   Summaries come from the local instruction model through Ollama; rule-based fallback only if
   Ollama is unreachable, and the report records which engine ran.
5. **Foundation bid**: `/api/bid/generate` takes the stored analysis + company profile and asks
   the local Llama-3 model for each bid section; page `/tenders/[id]/bid`.
6. **Verification** with a stub Ollama server (`scripts/mock-ollama.mjs`); hosted models are out of scope.
