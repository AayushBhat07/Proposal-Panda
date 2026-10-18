# CTO: local database rollout (2026-10-18)
Approves ADR-004 (SQLite + Drizzle) for the on-prem deployment. Inputs: `decisions/product-manager/local-database.md`,
`decisions/principal-architect/local-database.md`.

## Order
SDE-1 lands first (everything depends on it). Then SDE-2, SDE-3 and SDE-4 run in parallel on separate branches.
SDE-3 and SDE-4 code against `requireUser()`'s signature from SDE-1's stub, so they don't wait on SDE-2.

## Assignments
| SDE | Branch | Work | Done when |
|---|---|---|---|
| SDE-1 Foundation (P0) | `feat/db-foundation` | `lib/db/` (client, schema, migrations via drizzle-kit), `DATABASE_PATH`, `data/` in .gitignore, `serverExternalPackages`, `db:migrate` / `db:seed` scripts, `createDb(':memory:')` test helper, `requireUser()` stub that returns the cookie session; first CI workflow (`npm ci`, test, build) on ubuntu + windows | Fresh clone: `npm ci && npm run db:migrate && npm run dev` works; CI green on both OSes |
| SDE-2 Users and auth (P0) | `feat/db-users` | `users` repo, scrypt hashing, `verifyCredentials`, cookie `uid`+`ver`, real `requireUser()` (disabled / version / role from DB), new permissions, Admin users page + `/api/users` | PM criterion 2; forged/old cookies 401; tests for each role |
| SDE-3 Tender data (P0) | `feat/db-tender-data` | Repos + routes for tenders, reports, bids, company, answers; intelligence/run and bid/generate persist; replace localStorage reads/writes in dashboard, register, analysis, bid page, onboarding, jobsStore; `/api/import` + client one-time import | PM criteria 1, 3; import is idempotent; Viewer gets 403 on every write route |
| SDE-4 Vault and audit (P1) | `feat/db-vault-audit` | `vault_entries` + `/api/vault/entries`, `serverBackend`, IndexedDB-to-server move on first unlock, `audit_log` + server writes on vault/bid/user actions, Admin audit view, update `notes/document-vault-security-review.md` | PM criterion 4; vault tests pass on both backends; audit rows have no delete path |

## Review gates
Security engineer reviews SDE-2 and SDE-4 before merge. QA runs the two-browser test after SDE-3.
