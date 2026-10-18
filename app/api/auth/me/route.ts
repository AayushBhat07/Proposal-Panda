import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser, getSession, setSessionCookie } from '@/lib/auth/server';
import { SESSION_COOKIE } from '@/lib/auth/session';
import { getDb } from '@/lib/db/client';
import { findUserById } from '@/lib/db/repos/users';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser(request);
  if (!user) {
    const response = NextResponse.json({ user: null }, { status: 401 });
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }
  const { email, name, role } = user;
  const response = NextResponse.json({ user: { email, name, role } });
  // Re-issue the cookie when the name or role changed, so proxy.ts gates pages on the current role.
  const cookie = await getSession(request);
  if (cookie && (cookie.role !== role || cookie.name !== name)) {
    const row = findUserById(getDb(), user.uid);
    if (row) await setSessionCookie(response, row);
  }
  return response;
}
