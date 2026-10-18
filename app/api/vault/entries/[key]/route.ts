/** One sealed vault record. Values are opaque ciphertext from the browser; the server only stores them. */

import { NextRequest, NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { deleteVaultEntry, getVaultEntry, putVaultEntry } from '@/lib/db/repos/vault';
import { isVaultKey } from '@/lib/vault/wire';

type Params = { params: Promise<{ key: string }> };

/** A sealed 10 MB file grows by a third in base64; leave room for the JSON around it. */
const MAX_RECORD_CHARS = 15 * 1024 * 1024;

/** A vault.use route for one known slot; anything else is refused before the handler runs. */
const forSlot = (handler: (request: NextRequest, key: string) => Promise<Response> | Response) =>
  withPermission('vault.use', async (request, _auth, { params }: Params) => {
    const { key } = await params;
    if (!isVaultKey(key)) return NextResponse.json({ error: 'Unknown vault record.' }, { status: 400 });
    return handler(request, key);
  });

export const GET = forSlot((_request, key) => {
  const value = getVaultEntry(getDb(), key);
  if (value === undefined) return NextResponse.json({ error: 'Not found.' }, { status: 404 });
  return NextResponse.json({ value });
});

export const PUT = forSlot(async (request, key) => {
  const body = await request.json().catch(() => null);
  if (typeof body?.value !== 'string' || body.value.length > MAX_RECORD_CHARS) {
    return NextResponse.json({ error: 'A sealed record of 10 MB or less is required.' }, { status: 400 });
  }
  putVaultEntry(getDb(), key, body.value);
  return NextResponse.json({ ok: true });
});

export const DELETE = forSlot((_request, key) => {
  deleteVaultEntry(getDb(), key);
  return NextResponse.json({ ok: true });
});
