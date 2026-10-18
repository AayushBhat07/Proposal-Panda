import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { saveBid } from '@/lib/db/repos/tenders';

/** Saves edits to a drafted bid (sections edited, blanks filled, vault documents attached). */
export const PUT = withPermission('bid.generate', async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!body?.bid || !Array.isArray(body.bid.sections)) {
    return NextResponse.json({ error: 'A bid with sections is required.' }, { status: 400 });
  }
  if (!saveBid(getDb(), id, body.bid, auth.email)) {
    return NextResponse.json({ error: 'No such tender.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
});
