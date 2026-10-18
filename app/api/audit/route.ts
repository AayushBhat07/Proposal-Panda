import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { recent, record, VAULT_ACTIONS } from '@/lib/db/repos/audit';

/** ?scope=vault: the vault's own log, for anyone who can open the vault. Otherwise everything, for Admins. */
export async function GET(request: NextRequest) {
  const vaultOnly = request.nextUrl.searchParams.get('scope') === 'vault';
  const auth = await requirePermission(request, vaultOnly ? 'vault.use' : 'audit.view');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ entries: recent(getDb(), vaultOnly ? { actions: VAULT_ACTIONS } : { limit: 500 }) });
}

/** The vault page reports what it did; the server stamps who and when, and nobody can remove the row. */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'vault.use');
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (!(VAULT_ACTIONS as readonly string[]).includes(body?.action)) {
    return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  }
  record(getDb(), auth.email, body.action, 'vault', typeof body.detail === 'string' ? body.detail : null);
  return NextResponse.json({ ok: true }, { status: 201 });
}
