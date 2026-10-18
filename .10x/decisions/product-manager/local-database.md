# PM: local database (2026-10-18)

## Problem
Every computer in the contractor's office is an island. An analysis the Tender Analyst runs on one computer,
the bid the Bid Writer drafts on another, the company profile and the saved blank answers all live in that
browser's localStorage. Users are a hardcoded demo list (`lib/auth/users.ts`).

So RBAC is half useful today: it does block the APIs (only `tender.upload` can run analysis, only
`bid.generate` can draft), but it can't govern *who sees what*, because there is no shared data to see.
A Viewer has nothing to view unless they sit at the Bid Writer's computer. And nobody can add a real person
or change a role without a code change.

The document vault works today without a database: it is a deliberate "this computer only" locker
(`notes/document-vault-security-review.md`). What it can't do without a server store is be shared by the team,
or keep an access log that someone with devtools can't delete (finding M2).

## Target user
A small/mid civil contractor's office (2-8 people) bidding CPWD/state PWD tenders, on one LAN, running Ollama on
one office machine. Roles: Admin (owner), Bid Writer, Tender Analyst, Viewer (partner, accountant).

## User stories
- P0. As a Bid Writer, I open a tender the Analyst analysed on another computer, so I don't re-upload and re-run it.
- P0. As a Viewer, I read the analysis and the draft bid from my own computer, without being able to change them.
- P0. As an Admin, I add a person, set their role, and disable them when they leave, without a code change;
  a disabled person is locked out on their next request.
- P0. As anyone, the company profile and saved blank answers are filled once for the office, not once per browser.
- P0. As a current user, the tenders and bids already in my browser move into the shared store once, without loss.
- P1. As a Bid Writer, I unlock the same vault from any office computer with the office passphrase.
- P1. As an Admin, I read an access log of vault and bid actions that a user can't edit or delete.

## Success criteria
1. Two-browser test: Analyst uploads in browser A; Bid Writer sees the same analysis in browser B after a refresh.
2. Admin creates a user and changes a role from the UI; disabling a signed-in user makes their next API call 401.
3. After import, no business data is read from localStorage (grep for the storage helpers in pages returns only
   UI preferences such as plain view).
4. Vault (P1): searching the database file for a known GSTIN, PAN or certificate text finds nothing.
5. Backup is "copy one file" (`data/proposalpanda.db`) and restoring it restores everything.
6. Existing test suite still passes; new DB-backed tests run against an in-memory database.

## Approaches
| Scope | Includes | Cut | Risk |
|---|---|---|---|
| MVP | SQLite; users; tenders, reports, bids, company profile, blank answers server-side; one-time import | Vault stays per-computer; log stays in the vault | Team still can't share certificates |
| **Recommended** | MVP (P0) then shared encrypted vault + server-written audit log (P1) | Postgres, multiple companies, storing source PDFs | Vault ciphertext on the server is a new place to guess passphrases offline (same as a copied browser profile today) |
| Full | Postgres, multi-company tenancy, source PDF storage, automated backups | | Needs a hosting decision the user hasn't made |

## Not building now
Postgres or any hosted DB; multi-company tenancy; storing uploaded tender PDFs; SSO; password reset by email;
automated backups. Login rate limiting and CSRF tokens stay on the security backlog (CTO P0 #4), separate change.

## Risks
- Native module (`better-sqlite3`) fails to install on the office machine. Early signal: SDE-1's first PR runs
  `npm ci` on Windows and macOS in CI. Fallback: `@libsql/client` behind the same Drizzle schema.
- Import loses data. Mitigation: import is idempotent by id and the browser copy is only cleared after the server confirms.
- Shared vault weakens "this computer only". Mitigation: server only ever holds ciphertext; passphrase never leaves the browser.
