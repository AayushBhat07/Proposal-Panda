import { NextResponse, type NextRequest } from 'next/server';
import { getDb } from '@/lib/db/client';
import { findUserById, type UserRow } from '@/lib/db/repos/users';
import { can, type Permission, type RoleName } from './rbac';
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession, type Session } from './session';

export function getSession(request: NextRequest): Promise<Session | null> {
  return verifySession(request.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * The signed-in user as the database has them now: a valid cookie is not enough if the user was
 * disabled or their access changed since it was issued. Role and name come from the database row.
 */
export async function getCurrentUser(request: NextRequest): Promise<Session | null> {
  const session = await getSession(request);
  if (!session) return null;
  const user = findUserById(getDb(), session.uid);
  if (!user || user.disabledAt || user.sessionVersion !== session.ver) return null;
  return { ...session, email: user.email, name: user.name, role: user.role as RoleName };
}

/**
 * Route-handler guard. Returns the current user, or a 401/403 response to return as-is.
 * proxy.ts checks the cookie first; this is the authority because it reads the user's row.
 */
export async function requirePermission(
  request: NextRequest,
  permission?: Permission
): Promise<Session | NextResponse> {
  const user = await getCurrentUser(request);
  if (!user) {
    // The cookie is left alone: a slow 401 must not wipe a cookie a newer sign-in just set.
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (permission && !can(user.role, permission)) {
    return NextResponse.json({ error: 'Your role is not allowed to do this.' }, { status: 403 });
  }
  return user;
}

export async function setSessionCookie(response: NextResponse, user: UserRow): Promise<void> {
  const token = await signSession({
    uid: user.id,
    ver: user.sessionVersion,
    email: user.email,
    name: user.name,
    role: user.role as RoleName,
  });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
}
