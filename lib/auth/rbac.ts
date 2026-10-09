/**
 * Single source of truth for roles and permissions.
 * Imported by proxy.ts, API routes and client components alike.
 */

export const ROLES = ['Admin', 'BidWriter', 'TenderAnalyst', 'Viewer'] as const;
export type RoleName = (typeof ROLES)[number];

export type Permission =
  | 'tender.view' // open analysed tenders
  | 'tender.upload' // upload a tender and run analysis
  | 'bid.view' // read a generated bid
  | 'bid.generate'; // generate a foundation bid

const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  // Admin differs from BidWriter only once user management exists; kept so that has an owner.
  Admin: ['tender.view', 'tender.upload', 'bid.view', 'bid.generate'],
  BidWriter: ['tender.view', 'tender.upload', 'bid.view', 'bid.generate'],
  TenderAnalyst: ['tender.view', 'tender.upload', 'bid.view'],
  Viewer: ['tender.view', 'bid.view'],
};

export const ROLE_LABELS: Record<RoleName, string> = {
  Admin: 'Admin',
  BidWriter: 'Bid Writer',
  TenderAnalyst: 'Tender Analyst',
  Viewer: 'Viewer',
};

export function isRole(value: unknown): value is RoleName {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value);
}

export function can(role: RoleName | null | undefined, permission: Permission): boolean {
  return !!role && ROLE_PERMISSIONS[role].includes(permission);
}

/** Pages and API routes that need a specific permission. First match wins. */
const ROUTE_PERMISSIONS: Array<[RegExp, Permission]> = [
  [/^\/api\/intelligence\/run\/?$/, 'tender.upload'],
  [/^\/api\/bid\/generate\/?$/, 'bid.generate'],
  [/^\/tenders\/[^/]+\/bid\/?$/, 'bid.view'],
  [/^\/tenders(\/|$)/, 'tender.view'],
];

export function permissionForPath(pathname: string): Permission | null {
  return ROUTE_PERMISSIONS.find(([pattern]) => pattern.test(pathname))?.[1] ?? null;
}

/** Routes reachable without a session. */
export function isPublicPath(pathname: string): boolean {
  return pathname === '/login' || pathname.startsWith('/api/auth/');
}
