import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { listRegister } from '@/lib/db/repos/tenders';

/** Every analysed tender with its bid and stage, for the register and dashboard. */
export const GET = withPermission('tender.view', () => NextResponse.json(listRegister(getDb())));
