import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { openDb } from '../lib/db/open';
import { tenders } from '../lib/db/schema';

test('a fresh database migrates and stores JSON', () => {
  const db = openDb(':memory:');
  const report = { id: 'T-1', fileName: 'road.pdf', uploadedAt: '2026-10-01T10:00:00.000Z' };
  db.insert(tenders).values({ id: 'T-1', report }).run();
  const row = db.select().from(tenders).where(eq(tenders.id, 'T-1')).get();
  assert.deepEqual(row?.report, report);
  assert.ok(row?.createdAt);
});
