import { NextResponse, type NextRequest } from 'next/server';
import { can, type Permission } from './rbac';
import { SESSION_COOKIE, verifySession, type Session } from './session';

export function getSession(request: NextRequest): Promise<Session | null> {
  return verifySession(request.cookies.get(SESSION_COOKIE)?.value);
}

/**
 * Route-handler guard. Returns the session, or a 401/403 response to return as-is.
 * proxy.ts checks the same rules first; this keeps each handler safe on its own.
 */
export async function requirePermission(
  request: NextRequest,
  permission: Permission
): Promise<Session | NextResponse> {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }
  if (!can(session.role, permission)) {
    return NextResponse.json({ error: 'Your role is not allowed to do this.' }, { status: 403 });
  }
  return session;
}
