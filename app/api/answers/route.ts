import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { getAnswers, saveAnswers } from '@/lib/db/repos/company';

/** Answers to bid blanks remembered for the next bid (bank, signatory and the like). */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'bid.view');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ answers: getAnswers(getDb()) });
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, 'bid.generate');
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => null);
  if (!body?.answers || typeof body.answers !== 'object') {
    return NextResponse.json({ error: 'answers is required.' }, { status: 400 });
  }
  return NextResponse.json({ answers: saveAnswers(getDb(), body.answers, auth.email) });
}
