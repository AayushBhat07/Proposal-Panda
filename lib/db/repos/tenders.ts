/** Analysed tenders, their bids and pipeline stages: the office register. */

import { eq } from 'drizzle-orm';
import type { Db } from '../open';
import { bids, tenders } from '../schema';

/** A stored report: the pipeline's IntelligenceReport plus the upload details. Kept as the client saw it. */
export type StoredReport = { id: string; fileName: string; uploadedAt: string } & Record<string, unknown>;
export type StoredBid = { id: string; tenderId: string; sections: Array<{ content: string }> } & Record<string, unknown>;

/** Ids are made by the browser (TENDER-<time>); keep them safe to put in URLs and file names. */
export const isTenderId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);

export function tenderExists(db: Db, id: string): boolean {
  return !!db.select({ id: tenders.id }).from(tenders).where(eq(tenders.id, id)).get();
}

export function listRegister(db: Db): { reports: StoredReport[]; bids: StoredBid[]; stages: Record<string, string> } {
  const rows = db.select().from(tenders).orderBy(tenders.createdAt).all();
  return {
    reports: rows.map(r => r.report as StoredReport),
    bids: db
      .select()
      .from(bids)
      .all()
      .map(b => b.bid as StoredBid),
    stages: Object.fromEntries(rows.filter(r => r.stage).map(r => [r.id, r.stage!])),
  };
}

export function getTender(db: Db, id: string): { report: StoredReport; bid: StoredBid | null; stage: string | null } | null {
  const row = db.select().from(tenders).where(eq(tenders.id, id)).get();
  if (!row) return null;
  const bid = db.select().from(bids).where(eq(bids.id, id)).get();
  return { report: row.report as StoredReport, bid: (bid?.bid as StoredBid) ?? null, stage: row.stage };
}

/** Adds a new tender. Returns false if the id is taken (nothing is overwritten). */
export function addTender(db: Db, report: StoredReport, by: string): boolean {
  const result = db
    .insert(tenders)
    .values({ id: report.id, report, uploadedBy: by, createdAt: report.uploadedAt })
    .onConflictDoNothing()
    .run();
  return result.changes > 0;
}

export function updateReport(db: Db, id: string, change: (report: StoredReport) => StoredReport): boolean {
  const row = db.select().from(tenders).where(eq(tenders.id, id)).get();
  if (!row) return false;
  db.update(tenders).set({ report: change(row.report as StoredReport) }).where(eq(tenders.id, id)).run();
  return true;
}

export function setStage(db: Db, id: string, stage: string | null): boolean {
  return db.update(tenders).set({ stage }).where(eq(tenders.id, id)).run().changes > 0;
}

/** Saves the tender's bid, replacing any earlier one. False if the tender doesn't exist. */
export function saveBid(db: Db, id: string, bid: Record<string, unknown>, by: string): boolean {
  if (!tenderExists(db, id)) return false;
  const value = { ...bid, id };
  const updatedAt = new Date().toISOString();
  db.insert(bids)
    .values({ id, bid: value, updatedBy: by, updatedAt })
    .onConflictDoUpdate({ target: bids.id, set: { bid: value, updatedBy: by, updatedAt } })
    .run();
  return true;
}
