import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { createUser, listUsers } from '@/lib/db/repos/users';
import { record } from '@/lib/db/repos/audit';

export const GET = withPermission('user.manage', () => NextResponse.json({ users: listUsers(getDb()) }));

export const POST = withPermission('user.manage', async (request, auth) => {
  const body = await request.json().catch(() => ({}));
  const db = getDb();
  const user = createUser(db, {
    email: String(body.email ?? ''),
    name: String(body.name ?? ''),
    role: String(body.role ?? ''),
    password: String(body.password ?? ''),
  });
  record(db, auth.email, 'added user', user.email, user.role);
  return NextResponse.json({ user }, { status: 201 });
});
