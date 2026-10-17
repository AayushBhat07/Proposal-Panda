import { ANALYSIS_STEPS, type Pipeline, type ProgressEvent, type StepId, type StepStatus } from '@/lib/progress/events';
import { CREW, CREW_FOR, crewForStep, type CrewId, type CrewState } from './crew';

/**
 * Pure reducer from the progress events to what the site office shows.
 * Every state here comes from a server event; nothing is timed.
 */

export type GeneratorState = 'off' | 'starting' | 'running' | 'failed';

export interface CrewStatus {
  state: CrewState;
  /** Steps this crew member has finished (done or withheld). */
  finished: number;
  /** Steps this crew member owns: known for analysis, seen so far for a bid. */
  total: number;
  /** Bid sections (or steps) of theirs that came back withheld. */
  needsEdit: string[];
  /** The step they are on or last touched, in plain words. */
  current?: string;
}

export interface StepRow {
  step: StepId;
  name: string;
  crew: CrewId;
  status: StepStatus | 'waiting';
}

export type DiaryTone = 'info' | 'done' | 'warn' | 'fail';

export interface DiaryLine {
  key: string;
  at: number;
  text: string;
  tone: DiaryTone;
}

export interface OfficeState {
  crew: Record<CrewId, CrewStatus>;
  /** 0..1 */
  progress: number;
  generator: GeneratorState;
  steps: StepRow[];
  diary: DiaryLine[];
}

const ANALYSIS_NAMES: Record<string, string> = {
  extract: 'Reading the tender file',
  'model-check': 'Checking the local model',
  'executive-summary': 'Executive summary',
  'commercial-terms': 'Commercial terms',
  dates: 'Dates and obligations',
  'technical-scope': 'Technical scope',
  legal: 'Legal highlights',
  'attention-points': 'Points to watch',
  'eligibility-clauses': 'Eligibility and clauses',
  compliance: 'Compliance score',
};

const STATE_FOR: Record<StepStatus, CrewState> = {
  started: 'working',
  retry: 'redoing',
  done: 'done',
  withheld: 'needs-you',
  failed: 'failed',
};

const MIN_BID_STEPS = 10;

/** Plain name for a step: the event label when there is one, else a known name, else the section id in words. */
export function stepName(step: StepId, label?: string): string {
  if (label) return label;
  if (ANALYSIS_NAMES[step]) return ANALYSIS_NAMES[step];
  const words = step.replace(/^section:/, '').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function lower(name: string): string {
  return name.charAt(0).toLowerCase() + name.slice(1);
}

function diaryLine(event: ProgressEvent, name: string, index: number): DiaryLine {
  const who = CREW[crewForStep(event.step)].role;
  const what = lower(name);
  const key = `${index}`;
  switch (event.status) {
    case 'started':
      return { key, at: event.at, tone: 'info', text: event.detail ? `${who}: ${event.detail}` : `${who} started on ${what}.` };
    case 'retry':
      return { key, at: event.at, tone: 'warn', text: event.detail ? `${who} is redoing ${what}: ${event.detail}` : `${who} is redoing ${what}.` };
    case 'done':
      return { key, at: event.at, tone: 'done', text: event.detail ? `${who}: ${event.detail}` : `${who} finished ${what}.` };
    case 'withheld':
      return {
        key,
        at: event.at,
        tone: 'warn',
        text: event.detail ? `${who}, ${what}: ${event.detail}` : `${who} left ${what} for you to edit.`,
      };
    case 'failed':
      return { key, at: event.at, tone: 'fail', text: `${who} stopped on ${what}${event.detail ? `: ${event.detail}` : '.'}` };
  }
}

const FINISHED = new Set<StepStatus>(['done', 'withheld']);

export function officeState(pipeline: Pipeline, events: ProgressEvent[], error?: string | null): OfficeState {
  // Latest status and name per step, in first-seen order.
  const steps = new Map<StepId, StepRow>();
  if (pipeline === 'analysis') {
    for (const step of ANALYSIS_STEPS) steps.set(step, { step, name: stepName(step), crew: crewForStep(step), status: 'waiting' });
  }
  const latest = new Map<CrewId, { state: CrewState; current: string }>();
  const diary: DiaryLine[] = [];

  events.forEach((event, index) => {
    const prev = steps.get(event.step);
    const name = event.label ?? prev?.name ?? stepName(event.step);
    const crew = crewForStep(event.step);
    steps.set(event.step, { step: event.step, name, crew, status: event.status });
    latest.set(crew, { state: STATE_FOR[event.status], current: name });
    diary.push(diaryLine(event, name, index));
  });

  const rows = [...steps.values()];
  const crew = {} as Record<CrewId, CrewStatus>;
  for (const id of CREW_FOR[pipeline]) {
    const own = rows.filter(r => r.crew === id);
    const last = latest.get(id);
    crew[id] = {
      state: last?.state ?? 'idle',
      finished: own.filter(r => r.status !== 'waiting' && FINISHED.has(r.status)).length,
      total: own.length,
      needsEdit: own.filter(r => r.status === 'withheld').map(r => r.name),
      current: last?.current,
    };
  }

  // A run that errored stops whoever was still mid-step.
  if (error) {
    for (const status of Object.values(crew)) {
      if (status.state === 'working' || status.state === 'redoing' || status.state === 'starting') status.state = 'failed';
    }
  }

  const finished = rows.filter(r => r.status !== 'waiting' && FINISHED.has(r.status)).length;
  const total = pipeline === 'analysis' ? ANALYSIS_STEPS.length : Math.max(MIN_BID_STEPS, rows.length);

  const check = steps.get('model-check')?.status;
  let generator: GeneratorState =
    check === 'done' || check === 'withheld'
      ? 'running'
      : check === 'started' || check === 'retry'
        ? 'starting'
        : check === 'failed'
          ? 'failed'
          : 'off';
  if (error && generator !== 'running') generator = 'failed';

  return { crew, progress: Math.min(1, finished / total), generator, steps: rows, diary };
}

/** Short word for a bubble or pill. */
export const STATE_WORD: Record<CrewState, string> = {
  idle: 'idle',
  starting: 'on it',
  working: 'working',
  redoing: 'redoing',
  done: 'done',
  'needs-you': 'needs your edit',
  failed: 'stopped',
};

/** The line in a character's bubble: their working line while busy, else the state word. */
export function bubbleText(id: CrewId, state: CrewState): string {
  return state === 'working' ? CREW[id].workingLine : STATE_WORD[state];
}
