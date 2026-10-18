/** Encrypted vault records, stored as the browser sealed them. The server never holds a key. */

import { eq } from 'drizzle-orm';
import type { Db } from '../open';
import { vaultEntries } from '../schema';

export const vaultKeys = (db: Db): string[] => db.select({ key: vaultEntries.key }).from(vaultEntries).all().map(r => r.key);

export const getVaultEntry = (db: Db, key: string): string | undefined =>
  db.select().from(vaultEntries).where(eq(vaultEntries.key, key)).get()?.value;

export function putVaultEntry(db: Db, key: string, value: string): void {
  const updatedAt = new Date().toISOString();
  db.insert(vaultEntries)
    .values({ key, value, updatedAt })
    .onConflictDoUpdate({ target: vaultEntries.key, set: { value, updatedAt } })
    .run();
}

export const deleteVaultEntry = (db: Db, key: string) => db.delete(vaultEntries).where(eq(vaultEntries.key, key)).run();

export const clearVault = (db: Db) => db.delete(vaultEntries).run();
