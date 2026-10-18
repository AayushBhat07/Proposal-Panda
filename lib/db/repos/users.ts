/** People who can sign in, and what an Admin can change about them. */

import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import type { Db } from '../open';
import { users } from '../schema';
import { hashPassword, MIN_PASSWORD_LENGTH, verifyPassword } from '@/lib/auth/password';
import { isRole, type RoleName } from '@/lib/auth/rbac';

export type UserRow = typeof users.$inferSelect;

/** What the API and pages see: never the password hash. */
export interface PublicUser {
  id: string;
  email: string;
  name: string;
  role: RoleName;
  disabledAt: string | null;
  createdAt: string;
}

export class UserInputError extends Error {}

export function toPublicUser(row: UserRow): PublicUser {
  const { id, email, name, role, disabledAt, createdAt } = row;
  return { id, email, name, role: role as RoleName, disabledAt, createdAt };
}

const normaliseEmail = (email: string) => email.trim().toLowerCase();

export function findUserById(db: Db, id: string): UserRow | undefined {
  return db.select().from(users).where(eq(users.id, id)).get();
}

export function listUsers(db: Db): PublicUser[] {
  return db.select().from(users).orderBy(users.createdAt).all().map(toPublicUser);
}

export function countUsers(db: Db): number {
  return db.select({ n: sql<number>`count(*)` }).from(users).get()?.n ?? 0;
}

/** The signed-in user for these credentials, or null. Disabled users can't sign in. */
export function verifyCredentials(db: Db, email: string, password: string): UserRow | null {
  const row = db.select().from(users).where(eq(users.email, normaliseEmail(email))).get();
  if (!row || row.disabledAt || !verifyPassword(password, row.passwordHash)) return null;
  return row;
}

function checkPassword(password: string) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new UserInputError(`Passwords need at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

export function createUser(
  db: Db,
  input: { email: string; name: string; role: string; password: string },
  options: { skipPasswordCheck?: boolean } = {}
): PublicUser {
  const email = normaliseEmail(input.email);
  const name = input.name.trim();
  if (!/^[^\s@]+@[^\s@]+$/.test(email)) throw new UserInputError('Enter a valid email address.');
  if (!name) throw new UserInputError('Enter a name.');
  if (!isRole(input.role)) throw new UserInputError('Pick a role.');
  if (!options.skipPasswordCheck) checkPassword(input.password);
  if (db.select().from(users).where(eq(users.email, email)).get()) {
    throw new UserInputError('Someone with that email already has an account.');
  }
  const row = db
    .insert(users)
    .values({ id: randomUUID(), email, name, role: input.role, passwordHash: hashPassword(input.password) })
    .returning()
    .get();
  return toPublicUser(row);
}

function activeAdminCount(db: Db): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(and(eq(users.role, 'Admin'), isNull(users.disabledAt)))
      .get()?.n ?? 0
  );
}

/**
 * Change a user's role, name, password or disabled state. Any change that affects access bumps
 * session_version, so their current cookie stops working on its next request.
 */
export function updateUser(
  db: Db,
  id: string,
  changes: { name?: string; role?: string; disabled?: boolean; password?: string }
): PublicUser {
  const row = findUserById(db, id);
  if (!row) throw new UserInputError('No such user.');
  if (changes.role !== undefined && !isRole(changes.role)) throw new UserInputError('Pick a role.');
  if (changes.password !== undefined) checkPassword(changes.password);

  const losesAdmin =
    row.role === 'Admin' && !row.disabledAt && ((changes.role && changes.role !== 'Admin') || changes.disabled);
  if (losesAdmin && activeAdminCount(db) <= 1) {
    throw new UserInputError('Keep at least one active Admin, or nobody can manage users.');
  }

  const accessChanged =
    (changes.role !== undefined && changes.role !== row.role) ||
    (changes.disabled !== undefined && changes.disabled !== !!row.disabledAt) ||
    changes.password !== undefined;

  const updated = db
    .update(users)
    .set({
      ...(changes.name?.trim() ? { name: changes.name.trim() } : {}),
      ...(changes.role !== undefined ? { role: changes.role } : {}),
      ...(changes.disabled !== undefined
        ? { disabledAt: changes.disabled ? (row.disabledAt ?? new Date().toISOString()) : null }
        : {}),
      ...(changes.password !== undefined ? { passwordHash: hashPassword(changes.password) } : {}),
      ...(accessChanged ? { sessionVersion: row.sessionVersion + 1 } : {}),
    })
    .where(eq(users.id, id))
    .returning()
    .get();
  return toPublicUser(updated);
}
