import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { createUser, listUsers, UserInputError } from '@/lib/db/repos/users';
import { record } from '@/lib/db/repos/audit';

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, 'user.manage');
  if (auth instanceof NextResponse) return auth;
  return NextResponse.json({ users: listUsers(getDb()) });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, 'user.manage');
  if (auth instanceof NextResponse) return auth;
  const body = await request.json().catch(() => ({}));
  try {
    const db = getDb();
    const user = createUser(db, {
      email: String(body.email ?? ''),
      name: String(body.name ?? ''),
      role: String(body.role ?? ''),
      password: String(body.password ?? ''),
    });
    record(db, auth.email, 'added user', user.email, user.role);
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof UserInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
