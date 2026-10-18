# Architecture: local database (2026-10-18)
PM scope: `decisions/product-manager/local-database.md`. Stack: ADR-004 (SQLite + Drizzle + better-sqlite3).

## Shape
```
browser ──fetch──> Next route handlers ──> lib/db/repos/* ──> Drizzle ──> data/proposalpanda.db
   │                    │
   │                    └─ requireUser(permission): cookie → users row (not disabled, session_version matches) → role check
   └─ vault: encrypts/decrypts in the browser; server stores ciphertext only
```
Rules: only `lib/db/` imports Drizzle; route handlers call repos, never SQL. Pages never touch localStorage for
business data. proxy.ts stays cookie-only (fast page gating); route handlers are the authority because they read
the user row.

## Schema (Drizzle, `lib/db/schema.ts`)
| Table | Columns | Notes |
|---|---|---|
| `users` | id, email (unique, lowercased), name, role, password_hash, session_version int, disabled_at, created_at | Role values from `lib/auth/rbac.ts` ROLES |
| `company_profile` | id = 1, data json, updated_by → users, updated_at | Replaces `onboardingState` |
| `blank_answers` | id = 'company', answers json, updated_by, updated_at | Replaces `blankAnswers` |
| `tenders` | id, title, stage, uploaded_by, created_at | Replaces `tenders`, `tenderStages` |
| `intelligence_reports` | id, tender_id → tenders, report json, created_by, created_at | Replaces `intelligenceReports` |
| `bids` | id, tender_id → tenders, bid json, created_by, updated_by, updated_at | Replaces `foundationBids`; GSTIN/PAN stay as tokens (server already forces this) |
| `vault_entries` | key text pk, value blob, updated_at | Opaque ciphertext records from the vault `Backend` (header, slots). P1 |
| `audit_log` | id, at, user_id, action, target, detail | Insert-only from server code; no update/delete route. P1 |

Reports and bids stay JSON columns: their shapes are large, versioned in TypeScript types, and only ever loaded
whole. Promote fields to columns only when a list view needs to filter on them.

## Auth changes
- Cookie payload adds `uid` and `ver` (session_version). `requireUser(request, permission)` in `lib/auth/server.ts`
  loads the user, rejects disabled users or a `ver` mismatch with 401, then checks the role **from the DB row**
  (so a role change applies on the next request, not after 8 hours).
- `findUser` → `verifyCredentials(email, password)` against `users` (scrypt, timing-safe compare).
- New permissions in `rbac.ts`: `user.manage` (Admin), `company.edit` (Admin, BidWriter), `audit.view` (Admin).
  This is what finally makes Admin differ from Bid Writer.
- Dev seed: `npm run db:seed` creates the four demo accounts (password from `DEMO_PASSWORD`, default `password`
  in dev only). Production: first-run `npm run db:create-admin`.

## API
| Route | Methods | Permission |
|---|---|---|
| `/api/tenders` | GET list | tender.view |
| `/api/tenders/[id]` | GET tender + latest report + bid | tender.view |
| `/api/tenders/[id]/bid` | PUT save edits | bid.generate |
| `/api/intelligence/run` | (existing) now also writes tender + report | tender.upload |
| `/api/bid/generate` | (existing) now also writes bid | bid.generate |
| `/api/company` | GET / PUT | tender.view / company.edit |
| `/api/answers` | GET / PUT | bid.view / bid.generate |
| `/api/users` , `/api/users/[id]` | GET, POST / PATCH (role, disable, reset password) | user.manage |
| `/api/import` | POST browser data once | any signed-in user; rows keep their ids, existing ids skipped |
| `/api/vault/entries` , `/api/vault/entries/[key]` | GET, PUT, DELETE | vault.use (P1) |
| `/api/audit` | GET | audit.view (P1) |

## Vault (P1)
`lib/vault/vault.ts` already takes a `Backend` (get/put/delete/keys/clear). Add `serverBackend` that calls
`/api/vault/entries`; values are already sealed (AES-GCM, slot as AAD) before they leave the browser, so the
server never sees plaintext or the passphrase. On first unlock, if a local IndexedDB vault exists and the server
has none, copy its records up as-is, then offer to erase the local copy. The in-vault access log is replaced by
server-written `audit_log` rows (fixes M2 for honest-server cases). Viewers still get 403 on vault routes.
Residual risk: anyone with the DB file can guess passphrases offline, same as a copied browser profile today.

## Migration from the browser
On first load after sign-in, if any `tender-app-*` business keys exist, the app posts them to `/api/import`,
and clears them only after a 200. UI-only keys (plain view toggle, latest tender id) can stay.

## Testing
`createDb(':memory:')` + run migrations per test file. Repo tests and route-handler tests with a real cookie.
Keep `tests/vault.test.ts` passing with both the memory and the server backend.
