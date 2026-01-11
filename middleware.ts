import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Mock middleware for route protection
 * In prototype, we don't actually block routes - just validate localStorage on client
 * Real protection will be added in Phase-2 with proper auth
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't need auth
  const publicRoutes = ['/login'];
  
  // Allow public routes
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // For prototype, we allow all routes
  // Client-side will handle auth state and redirect if needed
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
