import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { saveBid } from '@/lib/db/repos/tenders';

/** Saves edits to a drafted bid (sections edited, blanks filled, vault documents attached). */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'bid.generate');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  if (!body?.bid || !Array.isArray(body.bid.sections)) {
    return NextResponse.json({ error: 'A bid with sections is required.' }, { status: 400 });
  }
  if (!saveBid(getDb(), id, body.bid, auth.email)) {
    return NextResponse.json({ error: 'No such tender.' }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
