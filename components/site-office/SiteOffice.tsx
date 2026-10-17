'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import { Check, ChevronDown, Coffee, Hammer, HardHat, LayoutGrid, List, NotebookPen, OctagonX, RotateCcw, TrafficCone, TriangleAlert } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { Pipeline, ProgressEvent } from '@/lib/progress/events';
import { CREW, CREW_FOR, type CrewId, type CrewState } from './crew';
import { officeState, STATE_WORD, type DiaryTone, type OfficeState, type StepRow } from './state';
import OfficeBackground, { WindowFrame } from './OfficeBackground';
import { BACK_DESKS, Desk, FRONT_DESKS, FrontDesk } from './Desk';
import { CrewSprite, Portrait } from './Character';
import Crane from './props/Crane';
import Generator from './props/Generator';
import styles from './office.module.css';

export interface SiteOfficeProps {
  pipeline: Pipeline;
  /** Every progress event received so far, in order. */
  events: ProgressEvent[];
  /** Shown in the heading, e.g. the uploaded file name or tender title. */
  title: string;
  /** Set when the run failed; the crew stops and the message shows. */
  error?: string | null;
}

// --- small client stores -------------------------------------------------------------

const PLAIN_KEY = 'site-office-plain-view';
const plainListeners = new Set<() => void>();
/** Fallback when localStorage is blocked, so the toggle still works for this visit. */
let memoryPlain: boolean | null = null;

function readPlain(): boolean {
  if (memoryPlain !== null) return memoryPlain;
  try {
    return window.localStorage.getItem(PLAIN_KEY) === '1';
  } catch {
    return false;
  }
}

function writePlain(value: boolean) {
  try {
    window.localStorage.setItem(PLAIN_KEY, value ? '1' : '0');
  } catch {
    memoryPlain = value;
  }
  plainListeners.forEach(l => l());
}

function subscribePlain(listener: () => void) {
  plainListeners.add(listener);
  window.addEventListener('storage', listener);
  return () => {
    plainListeners.delete(listener);
    window.removeEventListener('storage', listener);
  };
}

function subscribeVisibility(listener: () => void) {
  document.addEventListener('visibilitychange', listener);
  return () => document.removeEventListener('visibilitychange', listener);
}

// --- presentation maps ---------------------------------------------------------------

const PILL: Record<CrewState, { icon: LucideIcon; className: string }> = {
  idle: { icon: Coffee, className: 'bg-rule/60 text-muted' },
  starting: { icon: Hammer, className: 'bg-forest-tint text-forest' },
  working: { icon: Hammer, className: 'bg-forest-tint text-forest' },
  redoing: { icon: RotateCcw, className: 'bg-ochre-tint text-ochre' },
  done: { icon: Check, className: 'bg-forest text-paper' },
  'needs-you': { icon: TrafficCone, className: 'bg-[#f6d44a] text-ink' },
  failed: { icon: OctagonX, className: 'bg-seal-tint text-seal' },
};

const STEP_STATE: Record<StepRow['status'], CrewState> = {
  waiting: 'idle',
  started: 'working',
  retry: 'redoing',
  done: 'done',
  withheld: 'needs-you',
  failed: 'failed',
};

const DIARY_DOT: Record<DiaryTone, string> = {
  info: 'bg-rule-strong',
  done: 'bg-forest',
  warn: 'bg-ochre',
  fail: 'bg-seal',
};

function clock(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function StatePill({ state, label }: { state: CrewState; label?: string }) {
  const { icon: Icon, className } = PILL[state];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-sm px-1.5 py-0.5 text-xs font-medium ${className}`}>
      <Icon className="size-3" aria-hidden />
      {label ?? STATE_WORD[state]}
    </span>
  );
}

// --- the scene -----------------------------------------------------------------------

function Scene({ pipeline, office, selected }: { pipeline: Pipeline; office: OfficeState; selected: CrewId | null }) {
  const hidden = useSyncExternalStore(subscribeVisibility, () => document.hidden, () => false);
  const busy = (id: CrewId) => {
    const s = office.crew[id]?.state;
    return s === 'working' || s === 'redoing' || s === 'starting';
  };
  return (
    <div
      className={`relative w-full overflow-hidden rounded-sm border-2 border-ink bg-[#2a2420] ${styles.scene} ${hidden ? styles.paused : ''}`}
      style={{ aspectRatio: '320 / 180' }}
    >
      <svg viewBox="0 0 320 180" className={`absolute inset-0 size-full ${styles.pixel}`} shapeRendering="crispEdges" aria-hidden>
        <OfficeBackground />
        <Crane progress={office.progress} />
        <WindowFrame />
        <Generator state={office.generator} />
        {BACK_DESKS.map(id => (
          <Desk key={id} id={id} active={busy(id)} />
        ))}
      </svg>
      <div className="absolute inset-0 isolate [container-type:size]">
        {CREW_FOR[pipeline].map(id => (
          <CrewSprite key={id} id={id} state={office.crew[id].state} highlighted={selected === id} />
        ))}
      </div>
      <svg viewBox="0 0 320 180" className={`pointer-events-none absolute inset-0 size-full ${styles.pixel}`} shapeRendering="crispEdges" aria-hidden>
        {FRONT_DESKS.map(id => (
          <FrontDesk key={id} id={id} active={busy(id)} needs={office.crew[id]?.state === 'needs-you'} />
        ))}
      </svg>
    </div>
  );
}

function PlainList({ office, pipeline }: { office: OfficeState; pipeline: Pipeline }) {
  if (office.steps.length === 0) {
    return <p className="border border-rule bg-paper p-4 text-sm text-pretty text-muted">The crew is getting ready. The first step shows here as soon as it starts.</p>;
  }
  return (
    <ol className="divide-y divide-rule border border-rule bg-paper">
      {office.steps.map(row => (
        <li key={row.step} className="flex items-center gap-3 px-3 py-2">
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-ink">{row.name}</span>
            <span className="block truncate text-xs text-muted">{CREW[row.crew].role}</span>
          </span>
          <StatePill state={STEP_STATE[row.status]} label={row.status === 'waiting' ? (pipeline === 'analysis' ? 'waiting' : 'queued') : undefined} />
        </li>
      ))}
    </ol>
  );
}

// --- the panel -----------------------------------------------------------------------

export default function SiteOffice({ pipeline, events, title, error }: SiteOfficeProps) {
  const office = useMemo(() => officeState(pipeline, events, error), [pipeline, events, error]);
  const plain = useSyncExternalStore(subscribePlain, readPlain, () => false);
  const [diaryOpen, setDiaryOpen] = useState(false);
  const [selected, setSelected] = useState<CrewId | null>(null);
  const percent = Math.round(office.progress * 100);
  const diary = [...office.diary].reverse();
  const heading = pipeline === 'analysis' ? 'Reading the tender' : 'Drafting the bid';

  return (
    <section aria-label="Site office" className="flex min-w-0 flex-col gap-4 border border-rule-strong bg-sheet p-3 sm:p-5">
      <header className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-sm bg-[#f2c230] text-ink">
            <HardHat className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-xs text-muted">Site office · {heading}</p>
            <h2 className="truncate font-serif text-lg leading-snug text-ink sm:text-xl" title={title}>
              {title}
            </h2>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => writePlain(!plain)}
            aria-pressed={plain}
            className="inline-flex min-h-9 items-center gap-1.5 rounded border border-rule-strong px-3 text-sm text-ink-soft hover:bg-paper"
          >
            {plain ? <LayoutGrid className="size-4" aria-hidden /> : <List className="size-4" aria-hidden />}
            {plain ? 'Office view' : 'Plain view'}
          </button>
        </div>
        <div className="flex w-full items-center gap-3">
          <div
            role="progressbar"
            aria-label="Overall progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            className="h-2 flex-1 overflow-hidden rounded-sm bg-rule"
          >
            <div className={`h-full ${error ? 'bg-seal' : 'bg-forest'}`} style={{ width: `${percent}%` }} />
          </div>
          <span className="w-10 text-right font-mono text-sm text-ink tabular-nums">{percent}%</span>
        </div>
      </header>

      {error && (
        <p role="alert" className="flex items-start gap-2 border-l-4 border-seal bg-seal-tint px-3 py-2 text-sm text-pretty text-seal">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">Work stopped.</span> {error}
          </span>
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0">{plain ? <PlainList office={office} pipeline={pipeline} /> : <Scene pipeline={pipeline} office={office} selected={selected} />}</div>

        <aside className="flex min-w-0 flex-col border border-rule bg-paper lg:h-0 lg:min-h-full">
          <button
            type="button"
            onClick={() => setDiaryOpen(o => !o)}
            aria-expanded={diaryOpen}
            className="flex min-h-11 items-center gap-2 px-3 text-left lg:pointer-events-none"
          >
            <NotebookPen className="size-4 text-muted" aria-hidden />
            <span className="flex-1 text-sm font-medium text-ink">Site diary</span>
            <span className="font-mono text-xs text-muted tabular-nums">{office.diary.length}</span>
            <ChevronDown className={`size-4 text-muted lg:hidden ${diaryOpen ? 'rotate-180' : ''}`} aria-hidden />
          </button>
          <ol aria-live="polite" aria-relevant="additions" className={`min-h-0 flex-1 overflow-y-auto border-t border-rule px-3 py-2 ${diaryOpen ? 'max-lg:max-h-64' : 'max-lg:sr-only'}`}>
            {diary.length === 0 && <li className="py-1 text-sm text-muted">Nothing on site yet.</li>}
            {diary.map(line => (
              <li key={line.key} className="flex gap-2 py-1 text-sm text-pretty text-ink-soft">
                <span className={`mt-1.5 size-2 shrink-0 rounded-full ${DIARY_DOT[line.tone]}`} aria-hidden />
                <span className="min-w-0 flex-1">{line.text}</span>
                <span className="shrink-0 font-mono text-xs text-muted tabular-nums">{clock(line.at)}</span>
              </li>
            ))}
          </ol>
        </aside>
      </div>

      <ul className="-mx-1 flex snap-x gap-2 overflow-x-auto px-1 pb-1" aria-label="Crew">
        {CREW_FOR[pipeline].map(id => {
          const c = office.crew[id];
          const share = c.total ? c.finished / c.total : 0;
          const sub = c.needsEdit.length
            ? `${c.needsEdit.length} to edit`
            : (c.current ?? (pipeline === 'bid' && id === 'estimator' ? 'prices stay yours' : 'nothing yet'));
          return (
            <li key={id} className="w-52 shrink-0 snap-start">
              <button
                type="button"
                onClick={() => setSelected(s => (s === id ? null : id))}
                aria-pressed={selected === id}
                className={`flex w-full flex-col gap-2 rounded-sm border bg-paper p-2 text-left hover:border-ink-soft ${selected === id ? 'border-ink' : 'border-rule'}`}
              >
                <span className="flex items-center gap-2">
                  <Portrait id={id} state={c.state} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-ink">{CREW[id].role}</span>
                    <span className="block truncate text-xs text-muted">{sub}</span>
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  <StatePill state={c.state} label={c.state === 'needs-you' ? 'edit' : undefined} />
                  <span className="h-1.5 flex-1 overflow-hidden rounded-sm bg-rule" aria-hidden>
                    <span className={`block h-full ${c.state === 'failed' ? 'bg-seal' : 'bg-forest'}`} style={{ width: `${share * 100}%` }} />
                  </span>
                  <span className="font-mono text-xs text-muted tabular-nums">
                    {c.finished}/{c.total || '–'}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
