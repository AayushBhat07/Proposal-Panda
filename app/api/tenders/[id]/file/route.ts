import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { getTenderFile } from '@/lib/db/repos/tenders';

type Params = { params: Promise<{ id: string }> };

/** The NIT file the tender was analysed from. */
export const GET = withPermission('tender.view', async (_request, _auth, { params }: Params) => {
  const file = getTenderFile(getDb(), (await params).id);
  if (!file) return NextResponse.json({ error: 'No file is stored for this tender.' }, { status: 404 });
  return new NextResponse(new Uint8Array(file.data), {
    headers: {
      'Content-Type': file.type,
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
      'X-Content-Type-Options': 'nosniff',
    },
  });
});
