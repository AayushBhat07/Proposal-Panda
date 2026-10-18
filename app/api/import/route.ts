/**
 * One-time move of what a browser stored before the database existed. Rows keep their ids and nothing
 * already in the database is overwritten, so sending the same data twice is harmless. Each part needs the
 * permission that would let this user create it; parts they can't create come back as refused, and the
 * browser keeps them for someone who can.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { can } from '@/lib/auth/rbac';
import { getDb } from '@/lib/db/client';
import { getAnswers, hasCompany, saveAnswers, saveCompany } from '@/lib/db/repos/company';
import { addTender, getTender, isTenderId, saveBid, setStage, type StoredReport } from '@/lib/db/repos/tenders';
import { STAGE_LABELS } from '@/lib/tenders/pipeline';

type Part = 'reports' | 'bids' | 'stages' | 'company' | 'answers';

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request);
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Nothing to import.' }, { status: 400 });

  const db = getDb();
  const allowed: Record<Part, boolean> = {
    reports: can(auth.role, 'tender.upload'),
    stages: can(auth.role, 'tender.upload'),
    bids: can(auth.role, 'bid.generate'),
    company: can(auth.role, 'bid.generate'),
    answers: can(auth.role, 'bid.generate'),
  };
  const imported: Partial<Record<Part, number>> = {};
  const refused: Part[] = [];
  const present = (part: Part) => body[part] !== undefined && body[part] !== null;

  for (const part of Object.keys(allowed) as Part[]) {
    if (present(part) && !allowed[part]) refused.push(part);
  }

  if (present('reports') && allowed.reports && Array.isArray(body.reports)) {
    imported.reports = 0;
    for (const report of body.reports as StoredReport[]) {
      if (!isTenderId(report?.id) || typeof report.uploadedAt !== 'string') continue;
      if (addTender(db, report, auth.email)) imported.reports++;
    }
  }

  if (present('bids') && allowed.bids && Array.isArray(body.bids)) {
    imported.bids = 0;
    for (const bid of body.bids) {
      if (!isTenderId(bid?.id) || !Array.isArray(bid.sections)) continue;
      const tender = getTender(db, bid.id);
      // Only into a tender that exists and has no bid yet.
      if (tender && !tender.bid && saveBid(db, bid.id, bid, auth.email)) imported.bids++;
    }
  }

  if (present('stages') && allowed.stages && typeof body.stages === 'object') {
    imported.stages = 0;
    for (const [id, stage] of Object.entries(body.stages as Record<string, unknown>)) {
      const tender = getTender(db, id);
      if (tender && !tender.stage && typeof stage === 'string' && stage in STAGE_LABELS && setStage(db, id, stage)) {
        imported.stages++;
      }
    }
  }

  if (present('company') && allowed.company && body.company.companyProfile && !hasCompany(db)) {
    saveCompany(db, body.company, auth.email);
    imported.company = 1;
  }

  if (present('answers') && allowed.answers && typeof body.answers === 'object') {
    const existing = getAnswers(db);
    const fresh = Object.fromEntries(Object.entries(body.answers).filter(([key]) => !(key in existing)));
    saveAnswers(db, fresh as Record<string, string>, auth.email);
    imported.answers = Object.keys(fresh).length;
  }

  return NextResponse.json({ imported, refused });
}
