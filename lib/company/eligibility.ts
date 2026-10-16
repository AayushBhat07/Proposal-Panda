/**
 * Does the company qualify for a works tender? Checks the company file against the standard CPWD criteria
 * (Works Manual): similar works, average turnover, solvency and bid capacity, each as a share of the
 * estimated cost. A tender can set its own figures, so this is a first check, not a ruling.
 */

import type { CompanyProfile } from '@/types/onboarding.types';
import { bidCapacity } from './profile';

export type CheckResult = 'pass' | 'fail' | 'unknown';

export interface EligibilityCheck {
  label: string;
  /** What the criterion asks for this tender */
  need: string;
  result: CheckResult;
  /** What the company has, or what is missing */
  detail: string;
}

export interface Eligibility {
  verdict: 'yes' | 'no' | 'check';
  checks: EligibilityCheck[];
}

const crore = (lakh: number) => `₹ ${(lakh / 100).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} cr`;

/** "09/2022" → months since year 0, for the seven-year window. */
function monthIndex(mmYyyy: string): number | undefined {
  const m = /^(\d{1,2})\/(\d{4})$/.exec(mmYyyy.trim());
  return m ? Number(m[2]) * 12 + Number(m[1]) - 1 : undefined;
}

export function checkEligibility(profile: CompanyProfile | null, estimatedCostRupees: number | undefined, months: number | undefined, today = new Date()): Eligibility | null {
  if (!profile || !estimatedCostRupees) return null;
  const cost = estimatedCostRupees / 1e5; // in lakh
  const checks: EligibilityCheck[] = [];

  // Similar works completed in the last seven years: three of 40%, two of 60% or one of 80% of the cost.
  const now = today.getFullYear() * 12 + today.getMonth();
  const works = (profile.similarWorks ?? [])
    .filter(w => w.valueLakh != null && (monthIndex(w.completion) ?? now) >= now - 84)
    .map(w => w.valueLakh!)
    .sort((a, b) => b - a);
  const worksOk = works.filter(v => v >= 0.4 * cost).length >= 3 || works.filter(v => v >= 0.6 * cost).length >= 2 || works.some(v => v >= 0.8 * cost);
  checks.push({
    label: 'Similar works, last 7 years',
    need: `3 of ${crore(0.4 * cost)}, 2 of ${crore(0.6 * cost)} or 1 of ${crore(0.8 * cost)}`,
    result: works.length ? (worksOk ? 'pass' : 'fail') : 'unknown',
    detail: works.length ? works.slice(0, 3).map(crore).join(', ') : 'No similar works in the company file',
  });

  const recent = (profile.turnover ?? []).slice(0, 3).filter(t => t.lakh != null);
  const average = recent.length === 3 ? recent.reduce((s, t) => s + t.lakh!, 0) / 3 : undefined;
  checks.push({
    label: 'Average turnover, last 3 years',
    need: `At least ${crore(0.3 * cost)}`,
    result: average == null ? 'unknown' : average >= 0.3 * cost ? 'pass' : 'fail',
    detail: average == null ? 'Turnover for the last 3 years not in the company file' : crore(average),
  });

  checks.push({
    label: 'Solvency',
    need: `At least ${crore(0.4 * cost)}`,
    result: profile.solvencyLakh == null ? 'unknown' : profile.solvencyLakh >= 0.4 * cost ? 'pass' : 'fail',
    detail: profile.solvencyLakh == null ? 'Solvency not in the company file' : crore(profile.solvencyLakh),
  });

  const capacity = bidCapacity(profile, months, today);
  checks.push({
    label: 'Bid capacity',
    need: `At least ${crore(cost)}, the estimated cost`,
    result: capacity ? (capacity.capacity >= cost ? 'pass' : 'fail') : 'unknown',
    detail: capacity ? crore(capacity.capacity) : !months ? 'Completion period not found in the tender' : 'Needs turnover and works in hand',
  });

  const verdict = checks.some(c => c.result === 'fail') ? 'no' : checks.every(c => c.result === 'pass') ? 'yes' : 'check';
  return { verdict, checks };
}

export function eligibilitySummary(e: Eligibility): string {
  const passed = e.checks.filter(c => c.result === 'pass').length;
  if (e.verdict === 'yes') return `Yes · ${passed} of ${e.checks.length} checks`;
  if (e.verdict === 'no') {
    const failed = e.checks.find(c => c.result === 'fail')!;
    return `No · ${failed.label.split(',')[0].toLowerCase()} short`;
  }
  return `Check · ${e.checks.filter(c => c.result === 'unknown').length} unknown`;
}

