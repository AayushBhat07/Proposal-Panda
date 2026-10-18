import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { getCompany, saveCompany } from '@/lib/db/repos/company';

export const GET = withPermission(undefined, () => NextResponse.json(getCompany(getDb())));

/** Admins and Bid Writers keep the company file; GSTIN and PAN are dropped (they live in the vault). */
export const PUT = withPermission('bid.generate', async (request, auth) => {
  const body = await request.json().catch(() => null);
  const profile = body?.companyProfile;
  if (profile !== null && (typeof profile !== 'object' || typeof profile?.legalName !== 'string')) {
    return NextResponse.json({ error: 'A company profile is required.' }, { status: 400 });
  }
  return NextResponse.json(saveCompany(getDb(), { companyProfile: profile, isComplete: !!body.isComplete }, auth.email));
});
