# QA: local database (ADR-004)

Strategy: one browser run per role on a fresh database file, a server restart, then the same reads from new
browsers that have no prior storage. The database file is then read directly. Unit and API tests (143) cover the
permission edges; this run covers persistence end to end.

Result 2026-10-18 on feat/db-vault-audit: 23 of 23 checks pass. See reviews/2026-10-18-qa-report.md.

Stored in SQLite: users, company file, saved blank answers, tenders (report, key dates, stage), bids, the vault
(identifiers, certificate metadata and files, as ciphertext), audit log.
Still in the browser, by design: the session cookie, the "plain view" toggle, running-job progress (memory only),
and an empty `proposalpanda-vault` IndexedDB opened once to move an old browser vault to the server.
The uploaded NIT file is kept in `tender_files` (added after the first run, on the user's call); tenders imported from old browsers have none.

Bug found and fixed: the bid page asked the vault for status for every role, so a Viewer hit an uncaught 403.
