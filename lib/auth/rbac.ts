/**
 * Single source of truth for roles and permissions.
 * Imported by proxy.ts, API routes and client components alike.
 */

export const ROLES = ['Admin', 'TenderAnalyst', 'BidWriter', 'ComplianceReviewer', 'Executive'] as const;
export type RoleName = (typeof ROLES)[number];

export type Permission =
  | 'tender.view' // open analysed tenders
  | 'tender.upload' // upload a tender and run analysis
  | 'tender.create' // draft a new tender from a form (Generate Tender page)
  | 'bid.view' // read a generated bid
  | 'bid.generate'; // generate a foundation bid

const ROLE_PERMISSIONS: Record<RoleName, readonly Permission[]> = {
  Admin: ['tender.view', 'tender.upload', 'tender.create', 'bid.view', 'bid.generate'],
  TenderAnalyst: ['tender.view', 'tender.upload', 'bid.view'],
  BidWriter: ['tender.view', 'tender.upload', 'tender.create', 'bid.view', 'bid.generate'],
  ComplianceReviewer: ['tender.view', 'bid.view'],
  Executive: ['tender.view', 'bid.view'],
};

export const ROLE_LABELS: Record<RoleName, string> = {
  Admin: 'Admin',
  TenderAnalyst: 'Tender Analyst',
  BidWriter: 'Bid Writer',
  ComplianceReviewer: 'Compliance Reviewer',
  Executive: 'Executive',
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
  [/^\/api\/tender\/generate\/?$/, 'tender.create'],
  [/^\/api\/bid\/generate\/?$/, 'bid.generate'],
  [/^\/generate(\/|$)/, 'tender.create'],
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
