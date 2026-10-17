import { ANALYSIS_STEPS, STEP_LABELS, type Pipeline, type ProgressEvent, type StepId, type StepStatus } from '@/lib/progress/events';
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

const STATE_FOR: Record<StepStatus, CrewState> = {
  started: 'working',
  retry: 'redoing',
  done: 'done',
  withheld: 'needs-you',
  failed: 'failed',
};

// shortcut: the bid plan isn't sent, so assume the longest one (model check + 10 works sections) to keep
// progress from going backwards; send the plan with the model check if section counts start to vary more.
const MIN_BID_STEPS = 11;

/** Plain name for a step: the event label when there is one, else a known name, else the section id in words. */
export function stepName(step: StepId, label?: string): string {
  if (label) return label;
  if (step in STEP_LABELS) return STEP_LABELS[step as keyof typeof STEP_LABELS];
  const words = step.replace(/^section:/, '').replace(/-/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function diaryText(who: string, name: string, status: StepStatus, detail?: string): string {
  // Names are quoted as written: bid titles are title case, so lower-casing them reads wrong.
  const what = `“${name}”`;
  const tail = detail ? `: ${detail}` : '.';
  switch (status) {
    case 'started':
      return detail ? `${who}: ${detail}` : `${who} started ${what}.`;
    case 'retry':
      return `${who} is redoing ${what}${tail}`;
    case 'done':
      return detail ? `${who}: ${detail}` : `${who} finished ${what}.`;
    case 'withheld':
      return `${who} left ${what} for you to edit${tail}`;
    case 'failed':
      return `${who} stopped on ${what}${tail}`;
  }
}

const TONE: Record<StepStatus, DiaryTone> = { started: 'info', retry: 'warn', done: 'done', withheld: 'warn', failed: 'fail' };

const GENERATOR: Record<StepStatus, GeneratorState> = {
  started: 'starting',
  retry: 'starting',
  done: 'running',
  withheld: 'running',
  failed: 'failed',
};

/** Steps that are over, one way or another. A failed model check during analysis doesn't stop the run. */
const SETTLED = new Set<StepRow['status']>(['done', 'withheld', 'failed']);

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
    diary.push({ key: `${index}`, at: event.at, tone: TONE[event.status], text: diaryText(CREW[crew].role, name, event.status, event.detail) });
  });

  const rows = [...steps.values()];
  const crew = {} as Record<CrewId, CrewStatus>;
  for (const id of CREW_FOR[pipeline]) {
    const own = rows.filter(r => r.crew === id);
    const last = latest.get(id);
    const needsEdit = own.filter(r => r.status === 'withheld').map(r => r.name);
    crew[id] = {
      // A withheld section still needs the user after its owner finishes a later one.
      state: last?.state === 'done' && needsEdit.length ? 'needs-you' : (last?.state ?? 'idle'),
      finished: own.filter(r => SETTLED.has(r.status)).length,
      total: own.length,
      needsEdit,
      current: last?.current,
    };
  }

  // In a bid the Foreman owns no section: he hands them out and checks them until the last one is in.
  if (pipeline === 'bid' && rows.length) {
    const active = rows.find(r => r.status === 'started' || r.status === 'retry');
    crew.foreman.state = active || error ? 'working' : 'done';
    crew.foreman.current = active?.name;
  }

  // A run that errored stops whoever was still mid-step.
  if (error) {
    for (const status of Object.values(crew)) {
      if (status.state === 'working' || status.state === 'redoing' || status.state === 'starting') status.state = 'failed';
    }
  }

  const finished = rows.filter(r => SETTLED.has(r.status)).length;
  const total = pipeline === 'analysis' ? ANALYSIS_STEPS.length : Math.max(MIN_BID_STEPS, rows.length);

  const check = steps.get('model-check')?.status;
  let generator: GeneratorState = check && check !== 'waiting' ? GENERATOR[check] : 'off';
  // An error mid-check means the model never came up; any other error is not the generator's.
  if (error && generator === 'starting') generator = 'failed';

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
