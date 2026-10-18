import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { createUser, listUsers, UserInputError } from '@/lib/db/repos/users';

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
    const user = createUser(getDb(), {
      email: String(body.email ?? ''),
      name: String(body.name ?? ''),
      role: String(body.role ?? ''),
      password: String(body.password ?? ''),
    });
    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    if (error instanceof UserInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
