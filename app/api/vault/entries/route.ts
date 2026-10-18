import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { record } from '@/lib/db/repos/audit';
import { clearVault, vaultKeys } from '@/lib/db/repos/vault';

export const GET = withPermission('vault.use', () => NextResponse.json({ keys: vaultKeys(getDb()) }));

/** Erasing the office vault loses every certificate in it, so only an Admin can. */
export const DELETE = withPermission('user.manage', async (_request, auth) => {
  const db = getDb();
  clearVault(db);
  record(db, auth.email, 'erased', 'vault');
  return NextResponse.json({ ok: true });
});
