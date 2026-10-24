/**
 * The office database schema (SQLite via Drizzle). See .10x/decisions/principal-architect/local-database.md.
 * Reports and bids are stored whole as JSON: they are only ever loaded whole, and their shapes live in TypeScript.
 */

import { sqliteTable, text, integer, index, blob } from 'drizzle-orm/sqlite-core';
import type { Stage, StoredBid, StoredReport } from '@/lib/tenders/pipeline';

const now = () => new Date().toISOString();

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  role: text('role').notNull(),
  passwordHash: text('password_hash').notNull(),
  /** Bumped on role change, disable or password reset; cookies carrying an older value stop working. */
  sessionVersion: integer('session_version').notNull().default(1),
  disabledAt: text('disabled_at'),
  createdAt: text('created_at').notNull().$defaultFn(now),
});

/** Single row (id = 1): the office's company profile. */
export const companyProfile = sqliteTable('company_profile', {
  id: integer('id').primaryKey(),
  data: text('data', { mode: 'json' }).notNull(),
  updatedBy: text('updated_by'),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
});

/** Single row (id = 'company'): answers to bid blanks, filled once for the office. */
export const blankAnswers = sqliteTable('blank_answers', {
  id: text('id').primaryKey(),
  answers: text('answers', { mode: 'json' }).notNull(),
  updatedBy: text('updated_by'),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
});

/** One row per analysed tender: the stored report (summary, compliance, metadata) and its pipeline stage. */
export const tenders = sqliteTable('tenders', {
  id: text('id').primaryKey(),
  report: text('report', { mode: 'json' }).$type<StoredReport>().notNull(),
  /** Set by hand on the dashboard (submitted, won, lost…); null means work it out from the bid. */
  stage: text('stage').$type<Stage>(),
  uploadedBy: text('uploaded_by'),
  createdAt: text('created_at').notNull().$defaultFn(now),
});

/** The NIT file each tender was analysed from, kept so anyone can open the original again. */
export const tenderFiles = sqliteTable('tender_files', {
  id: text('id')
    .primaryKey()
    .references(() => tenders.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  data: blob('data', { mode: 'buffer' }).notNull(),
});

/** One bid per tender (id = tender id). GSTIN and PAN stay as tokens; the vault fills them at download. */
export const bids = sqliteTable('bids', {
  id: text('id')
    .primaryKey()
    .references(() => tenders.id, { onDelete: 'cascade' }),
  bid: text('bid', { mode: 'json' }).$type<StoredBid>().notNull(),
  updatedBy: text('updated_by'),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
});

/** Opaque, already-encrypted vault records. The server never sees a passphrase or plaintext. */
export const vaultEntries = sqliteTable('vault_entries', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
  updatedAt: text('updated_at').notNull().$defaultFn(now),
});

/** Insert-only: nothing in the app updates or deletes these rows. */
export const auditLog = sqliteTable(
  'audit_log',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    at: text('at').notNull().$defaultFn(now),
    userEmail: text('user_email').notNull(),
    action: text('action').notNull(),
    target: text('target'),
    detail: text('detail'),
  },
  t => [index('audit_at_idx').on(t.at)]
);
