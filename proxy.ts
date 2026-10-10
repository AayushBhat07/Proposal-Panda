import { NextResponse, type NextRequest } from 'next/server';
import { can, isPublicPath, permissionForPath } from '@/lib/auth/rbac';
import { SESSION_COOKIE, verifySession } from '@/lib/auth/session';

/**
 * Route protection: every page and API route needs a valid session,
 * and routes listed in rbac.ts also need the matching permission.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const isApi = pathname.startsWith('/api/');
  const session = await verifySession(request.cookies.get(SESSION_COOKIE)?.value);

  if (!session) {
    if (isApi) return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const permission = permissionForPath(pathname);
  if (permission && !can(session.role, permission)) {
    if (isApi) return NextResponse.json({ error: 'Your role is not allowed to do this.' }, { status: 403 });
    const dashboardUrl = new URL('/dashboard', request.url);
    dashboardUrl.searchParams.set('denied', pathname);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
