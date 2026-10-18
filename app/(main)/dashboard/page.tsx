'use client';

/**
 * Dashboard: what is due, what needs doing this week, where every bid stands, how much earnest money is out,
 * and whether the company qualifies. Built from the office's tenders, bids and company file.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/state/authStore';
import { useJobsStore } from '@/state/jobsStore';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { fetchRegister, saveStage } from '@/lib/data/api';
import { urgency } from '@/components/analysis/KeyDates';
import { RISK_CHIP } from '@/components/analysis/risk';
import { countdown, daysUntil, formatKeyDate, KEY_DATE_LABELS, type KeyDateKind } from '@/features/summarization/services/dates';
import { eligibilitySummary } from '@/lib/company/eligibility';
import {
  attention,
  buildPipeline,
  calendar,
  isOpenStage,
  MANUAL_STAGES,
  shortTitle,
  STAGE_LABELS,
  totals,
  type PipelineEntry,
  type Stage,
  type StoredBid,
  type StoredReport,
} from '@/lib/tenders/pipeline';

const crore = (rupees: number) => `₹ ${(rupees / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} cr`;
/** Lakh below a crore, crore above. */
const lakh = (rupees: number) =>
  rupees >= 1e7 ? crore(rupees) : `₹ ${(rupees / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} L`;

const STAGE_CHIP: Record<Stage, string> = {
  analysed: 'bg-rule/60 text-ink-soft',
  drafting: 'bg-ochre-tint text-ochre',
  ready: 'bg-forest-tint text-forest',
  submitted: 'bg-rule text-ink',
  won: 'bg-forest text-paper',
  lost: 'bg-seal-tint text-seal',
  skipped: 'bg-rule/60 text-muted',
};
const EVENT_TONE: Record<KeyDateKind, string> = { submission: 'bg-seal', preBid: 'bg-ochre', queries: 'bg-ochre', opening: 'bg-forest' };
const ELIGIBLE_TEXT = { yes: 'text-forest', no: 'text-seal', check: 'text-ochre' } as const;

export default function DashboardPage() {
  const { companyProfile } = useOnboarding();
  const { can } = useAuthStore();
  const [data, setData] = useState<{ reports: StoredReport[]; bids: StoredBid[]; stages: Record<string, Stage> } | null>(null);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () =>
      fetchRegister<StoredReport, StoredBid>().then(
        ({ reports, bids, stages }) => setData({ reports, bids, stages: stages as Record<string, Stage> }),
        (err: Error) => setError(err.message)
      );
    load();
    // An analysis or bid finishing in the background adds to what's stored.
    return useJobsStore.subscribe((state, prev) => {
      if (Object.entries(state.jobs).some(([key, job]) => job.status === 'done' && prev.jobs[key]?.status !== 'done')) load();
    });
  }, []);

  const pipeline = useMemo(() => (data ? buildPipeline(data.reports, data.bids, data.stages, companyProfile) : []), [data, companyProfile]);

  if (!data) {
    return error ? (
      <p role="alert" className="mx-auto mt-24 max-w-xl border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
        {error}
      </p>
    ) : (
      <Spinner size="lg" className="mt-24 text-forest" />
    );
  }

  const setStage = (id: string, stage: Stage | '') => {
    const stages = { ...data.stages };
    if (stage) stages[id] = stage;
    else delete stages[id];
    setData({ ...data, stages });
    saveStage(id, stage || null).catch((err: Error) => window.alert(err.message));
  };

  const sum = totals(pipeline);
  const todo = attention(pipeline, companyProfile);
  const { days, events } = calendar(pipeline);
  const closing = pipeline.filter(e => isOpenStage(e.stage) && e.due && daysUntil(e.due.date) >= 0 && daysUntil(e.due.date) <= 10);
  const unfinished = closing.filter(e => e.stage !== 'ready').length;
  const featured = pipeline.find(e => isOpenStage(e.stage) && e.eligibility);
  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-9 px-4 pt-10 pb-20 sm:px-8 lg:px-14">
      <div className="flex flex-col gap-2">
        <span className="font-mono text-xs tracking-widest text-muted">{today}</span>
        <h1 className="max-w-4xl font-serif text-4xl leading-tight text-balance text-ink">
          {pipeline.length === 0 ? (
            'No tenders yet. Upload one on the register to start.'
          ) : closing.length === 0 ? (
            'Nothing closes in the next 10 days.'
          ) : (
            <>
              {closing.length === 1 ? 'One bid closes' : `${spell(closing.length)} bids close`} in the next 10 days.{' '}
              {unfinished > 0 && <span className="text-seal">{unfinished === closing.length ? (unfinished === 1 ? 'It is not ready yet.' : 'None are ready yet.') : `${spell(unfinished)} still ${unfinished === 1 ? 'needs' : 'need'} work.`}</span>}
            </>
          )}
        </h1>
      </div>

      {pipeline.length === 0 ? (
        <Link href="/register" className="inline-flex items-center gap-2 self-start text-forest underline">
          Go to the register <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      ) : (
        <>
          <dl className="grid grid-cols-2 border-t border-b border-t-ink border-b-rule sm:grid-cols-3 lg:grid-cols-5">
            <Stat label="Due in 7 days" value={String(sum.dueThisWeek.length)} note={sum.dueThisWeek.map(e => shortTitle(e.title)).join(', ') || 'Nothing due'} />
            <Stat label="In drafting" value={String(sum.drafting.length)} note={sum.drafting.length ? `${sum.blanks} blanks left across bids` : 'No drafts open'} />
            <Stat label="EMD to deposit" value={lakh(sum.emdToDeposit)} note="For open bids you qualify for" />
            <Stat label="EMD with departments" value={lakh(sum.emdLocked)} note={sum.emdDueBack ? `${lakh(sum.emdDueBack)} due back on lost bids` : 'On submitted bids'} />
            <Stat
              label="Win rate"
              value={sum.won + sum.lost ? `${Math.round((sum.won / (sum.won + sum.lost)) * 100)}%` : '—'}
              note={sum.won + sum.lost ? `${sum.won} of ${sum.won + sum.lost} decided bids awarded` : `${sum.submitted} submitted, none decided yet`}
            />
          </dl>

          <div className="grid items-start gap-10 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="flex min-w-0 flex-col gap-10">
              <Section title="Bid pipeline">
                <div className="overflow-x-auto border border-rule-strong bg-sheet">
                  <table className="w-full min-w-[680px] border-collapse text-sm">
                    <thead>
                      <tr className="border-b border-ink text-left font-mono text-[11px] tracking-widest text-muted uppercase">
                        <th scope="col" className="px-4 py-3 font-medium">Tender</th>
                        <th scope="col" className="px-3 py-3 font-medium">Stage</th>
                        <th scope="col" className="px-3 py-3 font-medium">Bid due</th>
                        <th scope="col" className="px-3 py-3 text-right font-medium">Estimated cost</th>
                        <th scope="col" className="px-4 py-3 font-medium">You qualify?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pipeline.map(e => (
                        <PipelineRow key={e.id} entry={e} canEdit={can('tender.upload')} onStage={stage => setStage(e.id, stage)} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </Section>

              <Section title="Deadlines, next five weeks">
                <div className="border border-rule-strong bg-sheet p-4">
                  <div className="grid grid-cols-7 gap-px bg-rule" role="grid" aria-label="Calendar of tender dates">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                      <div key={d} role="columnheader" className="bg-paper py-1.5 text-center font-mono text-[11px] tracking-widest text-muted uppercase">
                        {d}
                      </div>
                    ))}
                    {days.map(day => {
                      const isToday = daysUntil(day) === 0;
                      const dayEvents = events.filter(ev => ev.date === day);
                      return (
                        <div key={day} role="gridcell" className={`min-h-20 bg-sheet p-1.5 ${isToday ? 'outline-2 -outline-offset-2 outline-ink' : ''} ${daysUntil(day) < 0 ? 'opacity-60' : ''}`}>
                          <span className={`font-mono text-[11px] ${isToday ? 'font-medium text-ink' : 'text-muted'}`}>
                            {Number(day.slice(8))}
                            {Number(day.slice(8)) === 1 && ` ${new Date(`${day}T00:00:00Z`).toLocaleDateString('en-IN', { month: 'short', timeZone: 'UTC' })}`}
                            {isToday && ' · today'}
                          </span>
                          {dayEvents.map(ev => (
                            <Link
                              key={`${ev.id}-${ev.kind}`}
                              href={`/tenders/${ev.id}/analysis`}
                              title={`${KEY_DATE_LABELS[ev.kind]}: ${ev.label}`}
                              className={`mt-1 block truncate px-1 py-0.5 text-[11px] leading-tight font-medium text-paper ${EVENT_TONE[ev.kind]}`}
                            >
                              {KEY_DATE_LABELS[ev.kind]} · {ev.label}
                            </Link>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs text-ink-soft">
                    <Legend tone="bg-seal" label="Bid due" />
                    <Legend tone="bg-ochre" label="Pre-bid meeting or queries" />
                    <Legend tone="bg-forest" label="Bid opening" />
                  </div>
                </div>
              </Section>
            </div>

            <aside className="flex flex-col gap-10">
              <Section title="Needs you this week">
                {todo.length === 0 ? (
                  <p className="text-sm text-ink-soft">Nothing needs you this week.</p>
                ) : (
                  <ul className="border border-rule-strong bg-sheet">
                    {todo.slice(0, 8).map(item => (
                      <li key={item.id} className="border-b border-dotted border-rule-strong last:border-0">
                        <Link href={item.href} className="flex gap-3 px-4 py-3 hover:bg-paper">
                          <span aria-hidden className={`mt-2 h-2 w-2 flex-none rounded-full ${item.tone === 'urgent' ? 'bg-seal' : item.tone === 'soon' ? 'bg-ochre' : 'bg-forest'}`} />
                          <span className="flex flex-col">
                            <span className="text-sm text-ink">{item.text}</span>
                            <span className="text-xs text-muted">{item.note}</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </Section>

              <Section title="Earnest money">
                <EmdList pipeline={pipeline} />
              </Section>

              {featured?.eligibility && (
                <Section title={featured.eligibility.verdict === 'yes' ? 'Why you qualify' : 'Can you bid?'}>
                  <Link href={`/tenders/${featured.id}/analysis`} className="-mt-2 text-sm text-ink-soft hover:text-forest">
                    {shortTitle(featured.title, 60)}, bid due {featured.due ? formatKeyDate(featured.due) : 'date not set'}
                  </Link>
                  <div className="border border-rule-strong bg-sheet px-4 py-2">
                    {featured.eligibility.checks.map(c => (
                      <div key={c.label} className="flex justify-between gap-4 border-b border-dotted border-rule-strong py-2.5 text-sm last:border-0">
                        <span className="flex flex-col">
                          <span className="text-ink">{c.label}</span>
                          <span className="text-xs text-muted">{c.need}</span>
                        </span>
                        <span className={`flex-none text-right font-medium ${c.result === 'pass' ? 'text-forest' : c.result === 'fail' ? 'text-seal' : 'text-ochre'}`}>
                          {c.result === 'pass' ? '✓ ' : c.result === 'fail' ? '✗ ' : '? '}
                          {c.detail}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    Standard CPWD criteria from your company file. The NIT can set different figures; check its eligibility clause.
                  </p>
                </Section>
              )}
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function PipelineRow({ entry: e, canEdit, onStage }: { entry: PipelineEntry; canEdit: boolean; onStage: (stage: Stage | '') => void }) {
  const days = e.due ? daysUntil(e.due.date) : undefined;
  return (
    <tr className="border-b border-dotted border-rule-strong align-top last:border-0">
      <td className="min-w-56 px-4 py-3.5">
        <Link href={`/tenders/${e.id}/analysis`} className="font-serif text-base leading-snug text-ink hover:text-forest">
          {e.title}
        </Link>
        <div className="mt-0.5 font-mono text-[11px] break-all text-muted">{e.reference}</div>
        {e.risk && <span className={`mt-1.5 inline-block px-1.5 py-0.5 text-[11px] font-medium ${RISK_CHIP[e.risk]}`}>{e.risk} risk</span>}
      </td>
      <td className="px-3 py-3.5">
        <span className={`inline-block px-2 py-0.5 text-xs font-medium whitespace-nowrap ${STAGE_CHIP[e.stage]}`}>
          {STAGE_LABELS[e.stage]}
          {e.stage === 'drafting' && e.blanks ? ` · ${e.blanks} blanks` : ''}
        </span>
        {canEdit && (
          <label className="mt-1.5 block">
            <span className="sr-only">Stage of {e.title}</span>
            <select
              value={e.stageSet ? e.stage : ''}
              onChange={ev => onStage(ev.target.value as Stage | '')}
              className="min-h-9 w-full border border-rule bg-paper px-1.5 text-xs text-ink-soft"
            >
              <option value="">Auto</option>
              {MANUAL_STAGES.map(s => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        )}
      </td>
      <td className="px-3 py-3.5 whitespace-nowrap">
        {e.due ? (
          <>
            <div className={`font-mono text-[13px] font-medium ${isOpenStage(e.stage) ? urgency(e.due.date) : 'text-ink-soft'}`}>
              {formatKeyDate({ date: e.due.date })}
              {days! >= 0 && ` · ${countdown(e.due.date)}`}
            </div>
            <div className="font-mono text-[11px] text-muted">{e.due.time ? `${e.due.time}` : 'Time not given'}{days! < 0 ? ' · closed' : ''}</div>
          </>
        ) : (
          <Link href={`/tenders/${e.id}/analysis`} className="text-xs text-ochre underline">
            Add due date
          </Link>
        )}
      </td>
      <td className="px-3 py-3.5 text-right font-mono text-[13px] whitespace-nowrap text-ink tabular-nums">{e.estimatedCost ? crore(e.estimatedCost) : '—'}</td>
      <td className={`px-4 py-3.5 text-sm font-medium ${e.eligibility ? ELIGIBLE_TEXT[e.eligibility.verdict] : 'text-muted'}`}>
        {e.eligibility ? eligibilitySummary(e.eligibility) : 'Not a works tender'}
      </td>
    </tr>
  );
}

function EmdList({ pipeline }: { pipeline: PipelineEntry[] }) {
  const rows = pipeline.filter(
    e =>
      e.emd &&
      (e.stage === 'submitted' || e.stage === 'lost' || (isOpenStage(e.stage) && e.due && daysUntil(e.due.date) >= 0 && e.eligibility?.verdict !== 'no'))
  );
  if (!rows.length) return <p className="text-sm text-ink-soft">No earnest money to deposit or recover right now.</p>;
  const status = (e: PipelineEntry) =>
    e.stage === 'submitted' ? { text: 'with the department', tone: 'text-ink' } : e.stage === 'lost' ? { text: 'due back', tone: 'text-forest' } : { text: 'to deposit', tone: 'text-ochre' };
  return (
    <ul className="border border-rule-strong bg-sheet">
      {rows.map(e => (
        <li key={e.id} className="flex items-baseline justify-between gap-3 border-b border-dotted border-rule-strong px-4 py-2.5 text-sm last:border-0">
          <span className="min-w-0 truncate text-ink-soft" title={e.title}>
            {shortTitle(e.title)}
          </span>
          <span className={`flex-none text-right font-mono text-[13px] ${status(e).tone}`}>
            {lakh(e.emd!)} <span className="font-sans text-xs">{status(e).text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="flex flex-col gap-0.5 border-dotted border-rule-strong py-4 pr-4 [&:not(:first-child)]:sm:border-l [&:not(:first-child)]:sm:pl-5">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="font-serif text-3xl text-ink tabular-nums">{value}</dd>
      <dd className="truncate text-xs text-ink-soft" title={note}>
        {note}
      </dd>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-serif text-xl font-semibold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Legend({ tone, label }: { tone: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`h-2.5 w-2.5 ${tone}`} />
      {label}
    </span>
  );
}


function spell(n: number): string {
  const words = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
  return words[n] ?? String(n);
}
