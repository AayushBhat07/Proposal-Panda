/**
 * Demo user directory: one account per role.
 * Replace findUser() with a real user store when one exists; nothing else needs to change.
 */

import type { RoleName } from './rbac';

interface DirectoryUser {
  email: string;
  name: string;
  role: RoleName;
}

const DEMO_USERS: DirectoryUser[] = [
  { email: 'admin@proposalpanda.dev', name: 'Asha Admin', role: 'Admin' },
  { email: 'analyst@proposalpanda.dev', name: 'Tarun Analyst', role: 'TenderAnalyst' },
  { email: 'writer@proposalpanda.dev', name: 'Bina Writer', role: 'BidWriter' },
  { email: 'reviewer@proposalpanda.dev', name: 'Ravi Reviewer', role: 'ComplianceReviewer' },
  { email: 'exec@proposalpanda.dev', name: 'Esha Executive', role: 'Executive' },
];

export const DEMO_EMAILS = DEMO_USERS.map(u => u.email);

function demoPassword(): string | null {
  if (process.env.DEMO_PASSWORD) return process.env.DEMO_PASSWORD;
  // Demo accounts only work in production when a password is configured explicitly.
  return process.env.NODE_ENV === 'production' ? null : 'password';
}

export function findUser(email: string, password: string): DirectoryUser | null {
  const expected = demoPassword();
  if (!expected || password !== expected) return null;
  return DEMO_USERS.find(u => u.email === email.trim().toLowerCase()) ?? null;
}
