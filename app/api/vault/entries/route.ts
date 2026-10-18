import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { record } from '@/lib/db/repos/audit';
import { clearVault, vaultKeys } from '@/lib/db/repos/vault';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'vault.use');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ keys: vaultKeys(getDb()) });
}

/** Erasing the office vault loses every certificate in it, so only an Admin can. */
export async function DELETE(request: NextRequest) {
  const auth = await requirePermission(request, 'user.manage');
  if (auth instanceof NextResponse) return auth;
  const db = getDb();
  clearVault(db);
  record(db, auth.email, 'erased', 'vault');
  return NextResponse.json({ ok: true });
}
