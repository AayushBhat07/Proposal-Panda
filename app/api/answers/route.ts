import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { getAnswers, saveAnswers } from '@/lib/db/repos/company';

/** Answers to bid blanks remembered for the next bid (bank, signatory and the like). */
export const GET = withPermission('bid.view', () => NextResponse.json({ answers: getAnswers(getDb()) }));

export const PUT = withPermission('bid.generate', async (request, auth) => {
  const body = await request.json().catch(() => null);
  if (!body?.answers || typeof body.answers !== 'object') {
    return NextResponse.json({ error: 'answers is required.' }, { status: 400 });
  }
  return NextResponse.json({ answers: saveAnswers(getDb(), body.answers, auth.email) });
});
