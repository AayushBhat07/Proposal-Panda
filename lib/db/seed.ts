import { DEMO_USERS } from '@/lib/auth/demo';
import type { Db } from './open';
import { countUsers, createUser } from './repos/users';

export function demoPassword(): string | null {
  if (process.env.DEMO_PASSWORD) return process.env.DEMO_PASSWORD;
  return process.env.NODE_ENV === 'production' ? null : 'password';
}

/** Adds the demo accounts when nobody has an account yet. */
export function seedDemoUsers(db: Db, password = demoPassword()): void {
  if (!password || countUsers(db) > 0) return;
  for (const user of DEMO_USERS) createUser(db, { ...user, password }, { skipPasswordCheck: true });
}
