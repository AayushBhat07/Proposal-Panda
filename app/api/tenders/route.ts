import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { listRegister } from '@/lib/db/repos/tenders';

/** Every analysed tender with its bid and stage, for the register and dashboard. */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'tender.view');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json(listRegister(getDb()));
}
