import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db/client';
import { toPublicUser, verifyCredentials } from '@/lib/db/repos/users';
import { setSessionCookie } from '@/lib/auth/server';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const user = verifyCredentials(getDb(), String(body.email ?? ''), String(body.password ?? ''));
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const { email, name, role } = toPublicUser(user);
  const response = NextResponse.json({ user: { email, name, role } });
  await setSessionCookie(response, user);
  return response;
}
