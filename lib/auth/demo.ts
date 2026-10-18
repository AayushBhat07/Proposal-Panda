/**
 * Demo accounts, one per role, so a fresh install can be tried. Seeded into an empty database by
 * lib/db/seed.ts; in production only when DEMO_PASSWORD is set. Real people are added on the Users page.
 */

import type { RoleName } from './rbac';

export const DEMO_USERS: Array<{ email: string; name: string; role: RoleName }> = [
  { email: 'admin@proposalpanda.dev', name: 'Asha Admin', role: 'Admin' },
  { email: 'analyst@proposalpanda.dev', name: 'Tarun Analyst', role: 'TenderAnalyst' },
  { email: 'writer@proposalpanda.dev', name: 'Bina Writer', role: 'BidWriter' },
  { email: 'viewer@proposalpanda.dev', name: 'Vikram Viewer', role: 'Viewer' },
];

export const DEMO_EMAILS = DEMO_USERS.map(u => u.email);
