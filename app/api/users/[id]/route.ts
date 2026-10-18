import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/auth/server';
import { getDb } from '@/lib/db/client';
import { updateUser, UserInputError } from '@/lib/db/repos/users';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, 'user.manage');
  if (auth instanceof NextResponse) return auth;
  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  try {
    const user = updateUser(getDb(), id, {
      name: typeof body.name === 'string' ? body.name : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
      disabled: typeof body.disabled === 'boolean' ? body.disabled : undefined,
      password: typeof body.password === 'string' ? body.password : undefined,
    });
    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof UserInputError) return NextResponse.json({ error: error.message }, { status: 400 });
    throw error;
  }
}
