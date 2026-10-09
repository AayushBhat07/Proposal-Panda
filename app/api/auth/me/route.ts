import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });
  const { email, name, role } = session;
  return NextResponse.json({ user: { email, name, role } });
}
