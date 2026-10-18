/** Route-handler test helpers: an in-memory database and signed-in requests. */

process.env.DATABASE_PATH = ':memory:';

import { NextRequest } from 'next/server';
import { getDb } from '../lib/db/client';
import { verifyCredentials } from '../lib/db/repos/users';
import { SESSION_COOKIE, signSession } from '../lib/auth/session';
import type { RoleName } from '../lib/auth/rbac';

export const DEMO = {
  Admin: 'admin@proposalpanda.dev',
  BidWriter: 'writer@proposalpanda.dev',
  TenderAnalyst: 'analyst@proposalpanda.dev',
  Viewer: 'viewer@proposalpanda.dev',
} satisfies Record<RoleName, string>;

export function userFor(role: RoleName) {
  return verifyCredentials(getDb(), DEMO[role], 'password')!;
}

export async function cookieFor(role: RoleName): Promise<string> {
  const user = verifyCredentials(getDb(), DEMO[role], 'password');
  if (!user) throw new Error(`${role} demo user missing or disabled`);
  return signSession({ uid: user.id, ver: user.sessionVersion, email: user.email, name: user.name, role });
}

export async function request(
  role: RoleName | null,
  path: string,
  init: { method?: string; body?: unknown } = {}
): Promise<NextRequest> {
  const headers = new Headers();
  if (role) headers.set('cookie', `${SESSION_COOKIE}=${await cookieFor(role)}`);
  if (init.body !== undefined) headers.set('content-type', 'application/json');
  return new NextRequest(new URL(path, 'http://localhost'), {
    method: init.method ?? 'GET',
    headers,
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
}

export const params = <T extends Record<string, string>>(value: T) => ({ params: Promise.resolve(value) });
