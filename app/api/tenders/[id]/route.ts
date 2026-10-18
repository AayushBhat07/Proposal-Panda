import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { getTender, setStage, updateReport } from '@/lib/db/repos/tenders';
import { STAGE_LABELS } from '@/lib/tenders/pipeline';

type Params = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, 'tender.view');
  if (auth instanceof NextResponse) return auth;
  const tender = getTender(getDb(), (await params).id);
  if (!tender) return NextResponse.json({ error: 'No such tender.' }, { status: 404 });
  return NextResponse.json(tender);
}

/** Corrected key dates (from a corrigendum) and the stage set by hand on the dashboard. */
export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = await requirePermission(request, 'tender.upload');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const db = getDb();

  if ('stage' in body) {
    if (body.stage !== null && !(typeof body.stage === 'string' && body.stage in STAGE_LABELS)) {
      return NextResponse.json({ error: 'Unknown stage.' }, { status: 400 });
    }
    if (!setStage(db, id, body.stage)) return NextResponse.json({ error: 'No such tender.' }, { status: 404 });
  }

  if ('keyDates' in body) {
    if (!Array.isArray(body.keyDates)) return NextResponse.json({ error: 'keyDates must be a list.' }, { status: 400 });
    const found = updateReport(db, id, report => {
      const summary = (report.summary ?? {}) as { metadata?: Record<string, unknown> };
      return { ...report, summary: { ...summary, metadata: { ...summary.metadata, keyDates: body.keyDates } } };
    });
    if (!found) return NextResponse.json({ error: 'No such tender.' }, { status: 404 });
  }

  return NextResponse.json(getTender(db, id));
}
