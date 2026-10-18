/**
 * Progress events streamed by /api/intelligence/run and /api/bid/generate.
 * The site office animation is driven only by these; nothing moves on a timer.
 *
 * Wire format: newline-delimited JSON. Zero or more `progress` lines, then exactly one
 * `result` or `error` line.
 */

export type Pipeline = 'analysis' | 'bid';

/** Analysis steps, in the order the pipeline runs them. */
export const ANALYSIS_STEPS = [
  'extract',
  'model-check',
  'executive-summary',
  'commercial-terms',
  'dates',
  'technical-scope',
  'legal',
  'attention-points',
  'eligibility-clauses',
  'compliance',
] as const;
export type AnalysisStep = (typeof ANALYSIS_STEPS)[number];

/** Plain names for the analysis steps (and the model check in a bid), sent as the event label. */
export const STEP_LABELS: Record<AnalysisStep, string> = {
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

/** Bid steps: the model check, then one step per bid section id (e.g. `section:methodology`). */
export type BidStep = 'model-check' | `section:${string}`;

export type StepId = AnalysisStep | BidStep;

/**
 * started: the step began. retry: a draft was rejected and is being redone.
 * done: finished. withheld: finished but the draft was withheld (needs a manual edit).
 * failed: the step could not run. Usually an `error` line follows; an analysis model check that finds
 * the model offline also fails, but the run carries on with extractive summaries.
 */
export type StepStatus = 'started' | 'retry' | 'done' | 'withheld' | 'failed';

export interface ProgressUpdate {
  step: StepId;
  status: StepStatus;
  /** Human title, e.g. the bid section title. */
  label?: string;
  /** One plain-language line for the site diary, e.g. "Completion period: 18 months". */
  detail?: string;
}

export interface ProgressEvent extends ProgressUpdate {
  type: 'progress';
  /** Milliseconds since the stream opened. */
  at: number;
}

export type StreamLine<T> =
  | ProgressEvent
  | { type: 'result'; data: T }
  | { type: 'error'; error: string; status: number };

export type OnProgress = (update: ProgressUpdate) => void;
