/**
 * The bid pipeline behind the dashboard: each analysed tender with its stage, deadline, money and whether
 * the company qualifies, plus what needs doing this week. Pure functions over what the browser stores, so
 * the dashboard and the tests read the same numbers.
 */

import type { CompanyProfile } from '@/types/onboarding.types';
import { checkEligibility, type Eligibility } from '@/lib/company/eligibility';
import { countBlanks } from '@/features/bid-generation/services/draftText';
import { daysUntil, type KeyDate, type KeyDateKind } from '@/features/summarization/services/dates';
import { rupees } from '@/features/summarization/services/boq';
import type { RiskLevel } from '@/features/compliance-scoring/types/compliance.types';

export const STAGES = ['analysed', 'drafting', 'ready', 'submitted', 'won', 'lost', 'skipped'] as const;
export type Stage = (typeof STAGES)[number];
/** Stages set by hand; the others follow from the bid draft. */
export const MANUAL_STAGES: Stage[] = ['submitted', 'won', 'lost', 'skipped'];

export const STAGE_LABELS: Record<Stage, string> = {
  analysed: 'Analysed',
  drafting: 'Drafting',
  ready: 'Ready to submit',
  submitted: 'Submitted',
  won: 'Awarded',
  lost: 'Not awarded',
  skipped: 'Not bidding',
};

/** What the browser keeps for each tender (the analysis report as stored by the register). */
export interface StoredReport {
  id: string;
  fileName: string;
  uploadedAt: string;
  summary?: {
    metadata?: {
      tenderTitle?: string;
      nameOfWork?: string;
      nitReference?: string;
      estimatedCost?: string;
      emdAmount?: string;
      completionMonths?: number;
      tenderKind?: 'works' | 'supply' | 'services';
      keyDates?: KeyDate[];
    };
  };
  compliance?: { riskLevel?: RiskLevel; complianceScore?: number };
}

export interface StoredBid {
  id: string;
  sections: Array<{ content: string }>;
}

export interface PipelineEntry {
  id: string;
  title: string;
  reference: string;
  stage: Stage;
  /** True when the stage was set by hand */
  stageSet: boolean;
  blanks?: number;
  due?: KeyDate;
  dates: KeyDate[];
  estimatedCost?: number;
  emd?: number;
  risk?: RiskLevel;
  eligibility: Eligibility | null;
  uploadedAt: string;
}

const OPEN: Stage[] = ['analysed', 'drafting', 'ready'];

/** "Construction of Office Building of BSI, HAWHRC, Solan" → "Office Building of BSI, HAWHRC, Solan", capped. */
export function shortTitle(title: string, max = 42): string {
  const cleaned = title.replace(/^(?:construction|providing|supply|repairs?|annual repair and maintenance)\s+of\s+/i, '');
  return cleaned.length > max ? `${cleaned.slice(0, max - 1).trimEnd()}…` : cleaned;
}
export const isOpenStage = (stage: Stage) => OPEN.includes(stage);

export function buildPipeline(
  reports: StoredReport[],
  bids: StoredBid[],
  stages: Record<string, Stage>,
  profile: CompanyProfile | null,
  today = new Date()
): PipelineEntry[] {
  const entries = reports.map(report => {
    const m = report.summary?.metadata ?? {};
    const bid = bids.find(b => b.id === report.id);
    const blanks = bid ? bid.sections.reduce((n, s) => n + countBlanks(s.content), 0) : undefined;
    const derived: Stage = !bid ? 'analysed' : blanks ? 'drafting' : 'ready';
    const set = stages[report.id];
    const estimatedCost = rupees(m.estimatedCost);
    return {
      id: report.id,
      title: m.nameOfWork || m.tenderTitle || report.fileName,
      reference: m.nitReference || report.fileName,
      stage: set ?? derived,
      stageSet: !!set,
      blanks,
      due: m.keyDates?.find(d => d.kind === 'submission'),
      dates: m.keyDates ?? [],
      estimatedCost,
      emd: rupees(m.emdAmount),
      risk: report.compliance?.riskLevel,
      eligibility: m.tenderKind && m.tenderKind !== 'works' ? null : checkEligibility(profile, estimatedCost, m.completionMonths, today),
      uploadedAt: report.uploadedAt,
    };
  });
  return entries.sort((a, b) => order(a, today) - order(b, today) || sortDate(a).localeCompare(sortDate(b)));
}

/** Open bids with a deadline ahead first, then open bids without one, then the rest. */
function order(e: PipelineEntry, today: Date): number {
  if (isOpenStage(e.stage) && e.due && daysUntil(e.due.date, today) >= 0) return 0;
  if (isOpenStage(e.stage) && !e.due) return 1;
  if (e.stage === 'submitted') return 2;
  return 3;
}
const sortDate = (e: PipelineEntry) => (e.due ? `${e.due.date} ${e.due.time ?? ''}` : `~${e.uploadedAt}`);

export interface Totals {
  dueThisWeek: PipelineEntry[];
  drafting: PipelineEntry[];
  blanks: number;
  /** EMD held by departments for submitted bids */
  emdLocked: number;
  /** EMD still to be deposited for open bids with a deadline ahead */
  emdToDeposit: number;
  /** EMD on bids not awarded, to be refunded */
  emdDueBack: number;
  submitted: number;
  won: number;
  lost: number;
}

export function totals(entries: PipelineEntry[], today = new Date()): Totals {
  const open = entries.filter(e => isOpenStage(e.stage) && e.due && daysUntil(e.due.date, today) >= 0);
  const sum = (list: PipelineEntry[]) => list.reduce((s, e) => s + (e.emd ?? 0), 0);
  const drafting = entries.filter(e => e.stage === 'drafting');
  return {
    dueThisWeek: open.filter(e => daysUntil(e.due!.date, today) <= 7),
    drafting,
    blanks: drafting.reduce((s, e) => s + (e.blanks ?? 0), 0),
    emdLocked: sum(entries.filter(e => e.stage === 'submitted')),
    // Bids you don't qualify for are left out: you won't be depositing for them.
    emdToDeposit: sum(open.filter(e => e.eligibility?.verdict !== 'no')),
    emdDueBack: sum(entries.filter(e => e.stage === 'lost')),
    submitted: entries.filter(e => ['submitted', 'won', 'lost'].includes(e.stage)).length,
    won: entries.filter(e => e.stage === 'won').length,
    lost: entries.filter(e => e.stage === 'lost').length,
  };
}

export interface Attention {
  id: string;
  tone: 'urgent' | 'soon' | 'info';
  text: string;
  note: string;
  href: string;
  /** For ordering: the date it relates to, or far ahead */
  sortKey: string;
}

const inr = (n: number) => `₹ ${(n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} lakh`;

const when = (d: KeyDate) => {
  const [y, m, day] = d.date.split('-').map(Number);
  const label = new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC' });
  return d.time ? `${label}, ${d.time}` : label;
};

/** The things to do in the next week, most urgent first. */
export function attention(entries: PipelineEntry[], profile: CompanyProfile | null, today = new Date()): Attention[] {
  const items: Attention[] = [];
  for (const e of entries) {
    if (!isOpenStage(e.stage)) continue;
    const short = shortTitle(e.title, 36);
    const days = e.due ? daysUntil(e.due.date, today) : undefined;
    if (e.due && days! >= 0 && days! <= 10) {
      const tone = days! <= 3 ? 'urgent' : 'soon';
      if (e.stage === 'analysed') items.push({ id: `${e.id}-draft`, tone, text: `Prepare the bid for ${short}`, note: `Bid due ${when(e.due)}`, href: `/tenders/${e.id}/bid`, sortKey: e.due.date });
      if (e.stage === 'drafting') items.push({ id: `${e.id}-blanks`, tone, text: `Fill ${e.blanks} ${e.blanks === 1 ? 'blank' : 'blanks'} in the ${short} bid`, note: `Bid due ${when(e.due)}`, href: `/tenders/${e.id}/bid`, sortKey: e.due.date });
      if (e.emd && days! <= 7 && e.eligibility?.verdict !== 'no') items.push({ id: `${e.id}-emd`, tone, text: `Arrange EMD of ${inr(e.emd)} for ${short}`, note: 'Banks usually need two working days for a guarantee', href: `/tenders/${e.id}/analysis`, sortKey: e.due.date });
    }
    for (const kind of ['preBid', 'queries'] as KeyDateKind[]) {
      const d = e.dates.find(x => x.kind === kind);
      const left = d ? daysUntil(d.date, today) : -1;
      if (d && left >= 0 && left <= 7) {
        items.push({
          id: `${e.id}-${kind}`,
          tone: left <= 2 ? 'urgent' : 'soon',
          text: kind === 'preBid' ? `Pre-bid meeting for ${short}: send your queries before it` : `Last date for queries on ${short}`,
          note: when(d),
          href: `/tenders/${e.id}/bid`,
          sortKey: d.date,
        });
      }
    }
    if (!e.due) items.push({ id: `${e.id}-nodate`, tone: 'info', text: `Add the bid due date for ${short}`, note: "It wasn't found in the tender text", href: `/tenders/${e.id}/analysis`, sortKey: '9998' });
    if (e.eligibility?.verdict === 'no' && (days ?? 0) >= 0) {
      const failed = e.eligibility.checks.find(c => c.result === 'fail')!;
      items.push({ id: `${e.id}-elig`, tone: 'soon', text: `You may not qualify for ${short}`, note: `${failed.label}: needs ${failed.need.replace(/^At least /, '')}, you have ${failed.detail}`, href: `/tenders/${e.id}/analysis`, sortKey: e.due?.date ?? '9997' });
    }
  }
  if (profile && (!profile.turnover?.length || !profile.similarWorks?.length)) {
    items.push({ id: 'profile', tone: 'info', text: 'Add turnover and similar works to the company file', note: 'Needed to check whether you qualify', href: '/company', sortKey: '9999' });
  }
  const rank = { urgent: 0, soon: 1, info: 2 };
  return items.sort((a, b) => rank[a.tone] - rank[b.tone] || a.sortKey.localeCompare(b.sortKey));
}

export interface CalendarEvent {
  id: string;
  date: string;
  kind: KeyDateKind;
  label: string;
}

/** Five weeks from the Monday of this week, with each tender's dates. */
export function calendar(entries: PipelineEntry[], today = new Date()): { days: string[]; events: CalendarEvent[] } {
  const monday = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate() - ((today.getDay() + 6) % 7)));
  const days = Array.from({ length: 35 }, (_, i) => new Date(monday.getTime() + i * 86_400_000).toISOString().slice(0, 10));
  const events = entries
    .filter(e => e.stage !== 'skipped')
    .flatMap(e => e.dates.map(d => ({ id: e.id, date: d.date, kind: d.kind, label: shortTitle(e.title, 28) })))
    .filter(ev => ev.date >= days[0] && ev.date <= days[days.length - 1]);
  return { days, events };
}
