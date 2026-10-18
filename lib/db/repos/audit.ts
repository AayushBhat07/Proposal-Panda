/** The office access log. Insert-only: nothing in the app updates or deletes these rows. */

import { desc, inArray } from 'drizzle-orm';
import type { Db } from '../open';
import { auditLog } from '../schema';

export type AuditEntry = typeof auditLog.$inferSelect;

export { VAULT_ACTIONS } from '@/lib/vault/actions';

export function record(db: Db, userEmail: string, action: string, target?: string | null, detail?: string | null): void {
  db.insert(auditLog)
    .values({ userEmail, action, target: target ?? null, detail: detail?.slice(0, 300) ?? null })
    .run();
}

export function recent(db: Db, options: { actions?: readonly string[]; limit?: number } = {}): AuditEntry[] {
  const query = db.select().from(auditLog);
  return (options.actions ? query.where(inArray(auditLog.action, [...options.actions])) : query)
    .orderBy(desc(auditLog.id))
    .limit(options.limit ?? 200)
    .all();
}
