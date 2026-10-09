import { NextRequest, NextResponse } from 'next/server';
import { findUser } from '@/lib/auth/users';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const user = findUser(String(body.email ?? ''), String(body.password ?? ''));
  if (!user) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
  }

  const response = NextResponse.json({ user });
  response.cookies.set(SESSION_COOKIE, await signSession(user), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return response;
}
