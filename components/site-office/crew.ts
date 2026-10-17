import type { Pipeline, StepId } from '@/lib/progress/events';

/**
 * The crew of the site office and which pipeline steps each one owns.
 * Positions are in scene pixels on a 320 x 180 logical canvas (scaled up by an integer factor).
 * See notes/site-office-animation-spec.md in the project files.
 */

export type CrewId =
  | 'foreman'
  | 'clerk'
  | 'electrician'
  | 'estimator'
  | 'planner'
  | 'engineer'
  | 'contracts'
  | 'safety'
  | 'inspector'
  | 'correspondence';

export type CrewState = 'idle' | 'starting' | 'working' | 'redoing' | 'done' | 'needs-you' | 'failed';

export interface Point {
  x: number;
  y: number;
}

export interface CrewMember {
  id: CrewId;
  role: string;
  /** Where the character sits while working. */
  desk: Point;
  /** One short bubble line shown while working. */
  workingLine: string;
}

export const SCENE = { width: 320, height: 180 } as const;

/** Fixed points characters walk between. */
export const WAYPOINTS = {
  door: { x: 300, y: 150 },
  foremanDesk: { x: 40, y: 40 },
  chai: { x: 270, y: 60 },
  window: { x: 160, y: 20 },
  generator: { x: 310, y: 120 },
} as const satisfies Record<string, Point>;

export const CREW: Record<CrewId, CrewMember> = {
  foreman: { id: 'foreman', role: 'Foreman', desk: { x: 40, y: 40 }, workingLine: 'checking the drafts' },
  clerk: { id: 'clerk', role: 'Document clerk', desk: { x: 30, y: 110 }, workingLine: 'scanning pages' },
  electrician: { id: 'electrician', role: 'Electrician', desk: { x: 276, y: 124 }, workingLine: 'starting the generator' },
  estimator: { id: 'estimator', role: 'Estimator', desk: { x: 80, y: 110 }, workingLine: 'totting up the EMD' },
  planner: { id: 'planner', role: 'Planner', desk: { x: 130, y: 110 }, workingLine: 'marking dates' },
  engineer: { id: 'engineer', role: 'Site engineer', desk: { x: 130, y: 45 }, workingLine: 'reading the scope' },
  contracts: { id: 'contracts', role: 'Contracts officer', desk: { x: 180, y: 110 }, workingLine: 'reading clauses' },
  safety: { id: 'safety', role: 'Safety officer', desk: { x: 230, y: 110 }, workingLine: 'flagging risks' },
  inspector: { id: 'inspector', role: 'Inspector', desk: { x: 220, y: 45 }, workingLine: 'stamping the report' },
  correspondence: { id: 'correspondence', role: 'Correspondence clerk', desk: { x: 80, y: 150 }, workingLine: 'typing the letter' },
};

/** Crew on the floor for each pipeline, in card order. */
export const CREW_FOR: Record<Pipeline, CrewId[]> = {
  analysis: ['foreman', 'clerk', 'electrician', 'estimator', 'planner', 'engineer', 'contracts', 'safety', 'inspector'],
  bid: ['foreman', 'electrician', 'clerk', 'correspondence', 'engineer', 'planner', 'contracts', 'safety', 'estimator'],
};

const TEMPLATE_SECTIONS = new Set(['document-checklist', 'declarations', 'bid-capacity', 'past-experience', 'financial-bid']);

/** Which crew member owns a step. Unknown bid sections go to the site engineer. */
export function crewForStep(step: StepId): CrewId {
  switch (step) {
    case 'extract':
      return 'clerk';
    case 'model-check':
      return 'electrician';
    case 'executive-summary':
      return 'foreman';
    case 'commercial-terms':
      return 'estimator';
    case 'dates':
      return 'planner';
    case 'technical-scope':
      return 'engineer';
    case 'legal':
    case 'eligibility-clauses':
      return 'contracts';
    case 'attention-points':
      return 'safety';
    case 'compliance':
      return 'inspector';
  }
  const section = step.slice('section:'.length);
  if (TEMPLATE_SECTIONS.has(section)) return 'clerk';
  if (section === 'letter-of-transmittal') return 'correspondence';
  if (section === 'work-programme') return 'planner';
  if (section === 'compliance-statement') return 'contracts';
  if (section === 'pre-bid-queries') return 'safety';
  return 'engineer';
}
