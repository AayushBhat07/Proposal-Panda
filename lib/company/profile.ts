/**
 * Arithmetic over the company file: financial years, ₹ lakh formatting, and the CPWD bid capacity formula.
 */

import type { CompanyProfile, TurnoverYear } from '@/types/onboarding.types';

/** Start year of the Indian financial year (April to March) that `date` falls in. */
export function fyStart(date: Date): number {
  return date.getMonth() >= 3 ? date.getFullYear() : date.getFullYear() - 1;
}

/** The five completed financial years before the current one, most recent first: "2025-26", "2024-25", … */
export function lastFiveYears(date = new Date()): string[] {
  const current = fyStart(date);
  return Array.from({ length: 5 }, (_, i) => {
    const start = current - 1 - i;
    return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
  });
}

export function emptyTurnover(date = new Date()): TurnoverYear[] {
  return lastFiveYears(date).map(year => ({ year, lakh: null }));
}

/** "₹ 1,564.87 lakh (₹ 15.65 crore)" for large values, "₹ 82.50 lakh" otherwise. */
export function formatLakh(lakh: number): string {
  const inLakh = `₹ ${lakh.toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} lakh`;
  return lakh >= 100 ? `${inLakh} (₹ ${(lakh / 100).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} crore)` : inLakh;
}

/** Parses a lakh amount typed by a person: "1,250.5" → 1250.5; blank or junk → null. */
export function parseLakh(text: string): number | null {
  const cleaned = text.replace(/[,\s₹]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export interface BidCapacity {
  /** Highest year's value brought to today's prices at 7% a year (simple), in lakh */
  a: number;
  /** The year that gave A */
  aYear: string;
  n: number;
  b: number;
  capacity: number;
}

/**
 * Available bid capacity = 2·A·N − B (CPWD Works Manual). A is the highest annual value of works executed
 * in the last five years, each year enhanced at a simple 7% for every year since. Null when a figure is missing.
 */
export function bidCapacity(profile: CompanyProfile, months: number | undefined, date = new Date()): BidCapacity | null {
  const current = fyStart(date);
  const years = (profile.turnover ?? []).filter((t): t is TurnoverYear & { lakh: number } => t.lakh != null && t.lakh > 0);
  if (!years.length || !months || profile.worksInHandLakh == null) return null;
  let best = { a: 0, aYear: '' };
  for (const t of years) {
    const start = Number(t.year.slice(0, 4));
    if (!Number.isFinite(start)) continue;
    const enhanced = t.lakh * (1 + 0.07 * Math.max(0, current - start));
    if (enhanced > best.a) best = { a: enhanced, aYear: t.year };
  }
  if (!best.aYear) return null;
  const n = Math.round((months / 12) * 100) / 100;
  const round = (x: number) => Math.round(x * 100) / 100;
  return { a: round(best.a), aYear: best.aYear, n, b: profile.worksInHandLakh, capacity: round(2 * best.a * n - profile.worksInHandLakh) };
}

/** One line for the model's context: what the bidder brings, without identifiers. */
export function experienceLine(profile: CompanyProfile): string {
  const parts: string[] = [];
  const recent = profile.turnover?.find(t => t.lakh != null);
  if (recent?.lakh != null) parts.push(`turnover FY ${recent.year} ${formatLakh(recent.lakh)}`);
  const works = (profile.similarWorks ?? []).filter(w => w.name);
  if (works.length) parts.push(`similar works completed: ${works.map(w => w.name).join('; ')}`);
  const staff = (profile.keyStaff ?? []).filter(s => s.name);
  if (staff.length) parts.push(`key staff: ${staff.map(s => `${s.qualification || 'staff'}${s.years ? ` (${s.years} yrs)` : ''}`).join(', ')}`);
  if (profile.machinery?.trim()) parts.push(`plant and machinery: ${profile.machinery.trim().replace(/\s*\n\s*/g, '; ')}`);
  return parts.join('. ');
}
