# ADR-004: SQLite + Drizzle as the local database

**Status:** Proposed · **Date:** 2026-10-18 · **Feature:** local-database
Resolves the open "persistence stack" decision in `decisions/cto/roadmap.md`.

## Context
All business data is in each browser's localStorage, users are a hardcoded list, and the app runs on one office
machine next to Ollama. We need a shared store now, with a path to a hosted DB later.

## Decision
SQLite in one file, `data/proposalpanda.db` (gitignored, path from `DATABASE_PATH`), opened with `better-sqlite3`
in WAL mode, schema and migrations with Drizzle ORM + drizzle-kit. Server-only module `lib/db/`.
Passwords hashed with `node:crypto` scrypt (no extra dependency).

## Alternatives considered
| Option | Why not now |
|---|---|
| Postgres (local or Docker) | A second service to install and keep running in a small office; nothing here needs concurrency SQLite can't handle |
| `node:sqlite` (built into Node 22) | Still flagged experimental in Node 22; revisit when the app moves to Node 24 |
| PGlite (Postgres in WASM) | Younger, heavier, slower writes; no benefit until we need Postgres features |
| Supabase / hosted | Tender and company data leave the office; user hasn't picked a host |
| Keep IndexedDB/localStorage | Can't share between computers, which is the whole problem |

## Consequences
+ One file to back up; no service to run; fast enough for a handful of users.
+ Drizzle schema ports to Postgres (`drizzle-orm/pg-core`) when the app is hosted; queries mostly unchanged.
- Native module: needs `serverExternalPackages: ['better-sqlite3']` in `next.config.ts` and a Node runtime for
  route handlers. If install breaks on the office OS, swap the driver for `@libsql/client` (same schema).
- Single writer; fine at office scale, not for a multi-office SaaS.
