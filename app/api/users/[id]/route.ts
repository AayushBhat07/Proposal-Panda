import { NextResponse } from 'next/server';
import { withPermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { updateUser } from '@/lib/db/repos/users';
import { record } from '@/lib/db/repos/audit';

export const PATCH = withPermission('user.manage', async (request, auth, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const changes = {
    name: typeof body.name === 'string' ? body.name : undefined,
    role: typeof body.role === 'string' ? body.role : undefined,
    disabled: typeof body.disabled === 'boolean' ? body.disabled : undefined,
    password: typeof body.password === 'string' ? body.password : undefined,
  };
  const db = getDb();
  const user = updateUser(db, id, changes);
  const what = [
    changes.role !== undefined && `role ${user.role}`,
    changes.disabled !== undefined && (changes.disabled ? 'turned off' : 'turned on'),
    changes.password !== undefined && 'password reset',
    changes.name !== undefined && 'renamed',
  ].filter(Boolean);
  record(db, auth.email, 'changed user', user.email, what.join(', '));
  return NextResponse.json({ user });
});
