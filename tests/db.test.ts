import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eq } from 'drizzle-orm';
import { openDb } from '../lib/db/open';
import { tenders } from '../lib/db/schema';

test('a fresh database migrates and stores JSON', () => {
  const db = openDb(':memory:');
  db.insert(tenders).values({ id: 'T-1', report: { title: 'Road works' } }).run();
  const row = db.select().from(tenders).where(eq(tenders.id, 'T-1')).get();
  assert.deepEqual(row?.report, { title: 'Road works' });
  assert.ok(row?.createdAt);
});
