import type { User } from '@/types/user.types';

/** Browser-side calls to /api/auth/*. The session itself is an HttpOnly cookie. */

export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch('/api/auth/me', { cache: 'no-store' });
  if (!response.ok) return null;
  const data = await response.json();
  return data.user ?? null;
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Login failed.');
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' });
}
