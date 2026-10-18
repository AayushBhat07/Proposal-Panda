/** One sealed vault record. Values are opaque ciphertext from the browser; the server only stores them. */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { deleteVaultEntry, getVaultEntry, putVaultEntry } from '@/lib/db/repos/vault';
import { isVaultKey } from '@/lib/vault/wire';

type Params = { params: Promise<{ key: string }> };

/** A sealed 10 MB file grows by a third in base64; leave room for the JSON around it. */
const MAX_RECORD_CHARS = 15 * 1024 * 1024;

async function guard(request: NextRequest, params: Params['params']) {
  const auth = await requirePermission(request, 'vault.use');
  if (auth instanceof NextResponse) return { error: auth };
  const { key } = await params;
  if (!isVaultKey(key)) return { error: NextResponse.json({ error: 'Unknown vault record.' }, { status: 400 }) };
  return { key };
}

export async function GET(request: NextRequest, { params }: Params) {
  const { key, error } = await guard(request, params);
  if (error) return error;
  const value = getVaultEntry(getDb(), key);
  if (value === undefined) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ value });
}

export async function PUT(request: NextRequest, { params }: Params) {
  const { key, error } = await guard(request, params);
  if (error) return error;
  const body = await request.json().catch(() => null);
  if (typeof body?.value !== 'string' || body.value.length > MAX_RECORD_CHARS) {
    return NextResponse.json({ error: 'A sealed record of 10 MB or less is required.' }, { status: 400 });
  }
  putVaultEntry(getDb(), key, body.value);
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { key, error } = await guard(request, params);
  if (error) return error;
  deleteVaultEntry(getDb(), key);
  return NextResponse.json({ ok: true });
}
