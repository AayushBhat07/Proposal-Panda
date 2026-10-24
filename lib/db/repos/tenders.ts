/** Analysed tenders, their bids and pipeline stages: the office register. */

import { eq } from 'drizzle-orm';
import type { Db } from '../open';
import { bids, tenderFiles, tenders } from '../schema';
import type { Stage, StoredBid, StoredReport } from '@/lib/tenders/pipeline';

export type { StoredBid, StoredReport };

/** Ids are made by the browser (TENDER-<time>); keep them safe to put in URLs and file names. */
export const isTenderId = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(id);

export function tenderExists(db: Db, id: string): boolean {
  return !!db.select({ id: tenders.id }).from(tenders).where(eq(tenders.id, id)).get();
}

export function listRegister(db: Db): { reports: StoredReport[]; bids: StoredBid[]; stages: Record<string, Stage> } {
  const rows = db.select().from(tenders).orderBy(tenders.createdAt).all();
  return {
    reports: rows.map(r => r.report),
    bids: db.select().from(bids).all().map(b => b.bid),
    stages: Object.fromEntries(rows.filter(r => r.stage).map(r => [r.id, r.stage!])),
  };
}

export function getTender(
  db: Db,
  id: string
): { report: StoredReport; bid: StoredBid | null; stage: Stage | null; hasFile: boolean } | null {
  const row = db.select().from(tenders).where(eq(tenders.id, id)).get();
  if (!row) return null;
  const bid = db.select().from(bids).where(eq(bids.id, id)).get();
  const hasFile = !!db.select({ id: tenderFiles.id }).from(tenderFiles).where(eq(tenderFiles.id, id)).get();
  return { report: row.report, bid: bid?.bid ?? null, stage: row.stage, hasFile };
}

export type TenderFile = { name: string; type: string; data: Buffer };

/** Adds a new tender, with the file it came from if given. Returns false if the id is taken (nothing is overwritten). */
export function addTender(db: Db, report: StoredReport, by: string, file?: TenderFile): boolean {
  return db.transaction(tx => {
    const result = tx
      .insert(tenders)
      .values({ id: report.id, report, uploadedBy: by, createdAt: report.uploadedAt })
      .onConflictDoNothing()
      .run();
    if (!result.changes) return false;
    if (file) tx.insert(tenderFiles).values({ id: report.id, ...file }).run();
    return true;
  });
}

export function getTenderFile(db: Db, id: string): TenderFile | null {
  return db.select({ name: tenderFiles.name, type: tenderFiles.type, data: tenderFiles.data }).from(tenderFiles).where(eq(tenderFiles.id, id)).get() ?? null;
}

export function updateReport(db: Db, id: string, change: (report: StoredReport) => StoredReport): boolean {
  const row = db.select().from(tenders).where(eq(tenders.id, id)).get();
  if (!row) return false;
  db.update(tenders).set({ report: change(row.report) }).where(eq(tenders.id, id)).run();
  return true;
}

export function setStage(db: Db, id: string, stage: Stage | null): boolean {
  return db.update(tenders).set({ stage }).where(eq(tenders.id, id)).run().changes > 0;
}

/** Saves the tender's bid, replacing any earlier one. False if the tender doesn't exist. */
export function saveBid(db: Db, id: string, bid: StoredBid, by: string): boolean {
  if (!tenderExists(db, id)) return false;
  const value = { ...bid, id };
  const updatedAt = new Date().toISOString();
  db.insert(bids)
    .values({ id, bid: value, updatedBy: by, updatedAt })
    .onConflictDoUpdate({ target: bids.id, set: { bid: value, updatedBy: by, updatedAt } })
    .run();
  return true;
}
