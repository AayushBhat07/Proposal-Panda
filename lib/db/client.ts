/**
 * Server-only database handle. One SQLite file (DATABASE_PATH, default data/proposalpanda.db),
 * migrated on open so a fresh office install needs no extra step.
 */

import { seedDemoUsers } from './seed';
import { openDb, type Db } from './open';

export type { Db } from './open';

const globalForDb = globalThis as unknown as { ppDb?: Db };

export function getDb(): Db {
  // Cached on globalThis so dev hot reloads don't open a new connection each time.
  if (!globalForDb.ppDb) {
    const db = openDb(process.env.DATABASE_PATH || 'data/proposalpanda.db');
    seedDemoUsers(db);
    globalForDb.ppDb = db;
  }
  return globalForDb.ppDb;
}
