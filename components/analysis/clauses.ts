/**
 * The clause register: contract clauses a contractor reads before quoting, each with the tender's own words
 * (quoted at analysis time by text rules, not by the model) and what the clause means for the bid.
 */

import type { TenderSummary } from '@/features/summarization/types/summarization.types';

export type ClauseGroup = 'Eligibility' | 'Money' | 'Time' | 'Legal' | 'Submission';

export interface ClauseEntry {
  label: string;
  group: ClauseGroup;
  meaning: string;
  /** The tender's words, when the clause was found */
  quote?: string;
}

/** Labels match those the summarizer gives eligibility, keyTerms and riskClauses. */
const CATALOGUE: Array<Omit<ClauseEntry, 'quote'>> = [
  { label: 'Enlistment', group: 'Eligibility', meaning: 'Who may bid at all: the registration class and category the tender asks for. Check yours is valid on the last date of submission.' },
  { label: 'Similar works', group: 'Eligibility', meaning: 'The completed works you must show, as shares of the estimated cost. Keep the completion certificates ready to upload.' },
  { label: 'Government work', group: 'Eligibility', meaning: 'At least one of the qualifying works must be for a government body. A private-client work alone will not do.' },
  { label: 'Turnover', group: 'Eligibility', meaning: 'Minimum average annual turnover, certified by a chartered accountant. Use the figure here, not the CPWD default.' },
  { label: 'Solvency', group: 'Eligibility', meaning: 'A bank or CA solvency certificate of at least this value, usually not older than one year.' },
  { label: 'Profitability', group: 'Eligibility', meaning: 'Loss years the tender tolerates in recent balance sheets.' },
  {
    label: 'Performance guarantee',
    group: 'Money',
    meaning:
      'Furnished after the work is awarded, usually as a bank guarantee or FDR, and held until the defect liability period ends. Budget for the bank charges and margin money.',
  },
  {
    label: 'Security deposit',
    group: 'Money',
    meaning: 'Deducted from each running bill until it reaches the stated amount, and refunded only after the defect liability period. It ties up working capital for the whole contract.',
  },
  {
    label: 'Mobilisation advance',
    group: 'Money',
    meaning: 'An advance against a bank guarantee, usually with interest, recovered from later bills. It helps early cash flow but adds a guarantee to arrange.',
  },
  {
    label: 'Price variation (Clause 10CC)',
    group: 'Money',
    meaning:
      'Says whether rates are adjusted when material and labour prices change. Where it does not apply, the quoted rates must carry price rises for the whole completion period.',
  },
  {
    label: 'Unconditional guarantee',
    group: 'Money',
    meaning: 'The department can encash the guarantee on demand without proving a loss. Treat the full amount as at risk if the contract goes wrong.',
  },
  {
    label: 'Forfeiture',
    group: 'Money',
    meaning: 'Events on which the EMD, security deposit or guarantee is forfeited, such as withdrawing the bid or not starting work. Read these before submitting.',
  },
  {
    label: 'Compensation for delay (Clause 2)',
    group: 'Time',
    meaning: 'Liquidated damages for finishing late, usually a percentage per month capped at a share of the tendered value. Plan the programme with float against it.',
  },
  {
    label: 'Extension of time',
    group: 'Time',
    meaning: 'How and when to apply for more time when the delay is not yours. Applications made late are often refused, so note the deadline.',
  },
  {
    label: 'Force majeure',
    group: 'Time',
    meaning: 'Events beyond either party\'s control that excuse delay, and the notice you must give when one happens.',
  },
  {
    label: 'Short notice',
    group: 'Time',
    meaning: 'Something the tender expects within hours or a few days. Check you can meet it with the staff and documents you have.',
  },
  {
    label: 'Final and binding',
    group: 'Legal',
    meaning: 'Decisions of the Engineer-in-Charge or another officer that cannot be challenged later, including in arbitration.',
  },
  {
    label: 'Indemnity',
    group: 'Legal',
    meaning: 'Losses and claims you agree to make good to the department, such as accidents on site or third-party damage. Check your insurance covers them.',
  },
  {
    label: 'Dispute resolution',
    group: 'Legal',
    meaning: 'Where disputes go (dispute board, arbitration, courts) and which city\'s courts have jurisdiction. Some tenders bar arbitration above a value.',
  },
  {
    label: 'Online submission',
    group: 'Submission',
    meaning: 'How the bid is submitted. E-tenders need a valid Class III digital signature and close at the portal\'s clock, not yours.',
  },
];

export const CLAUSE_GROUPS: ClauseGroup[] = ['Eligibility', 'Money', 'Time', 'Legal', 'Submission'];

/**
 * Every catalogued clause, with the tender's words where they were found. Null for reports analysed before
 * clauses were quoted, which need a fresh upload.
 */
export function clauseRegister(metadata: TenderSummary['metadata']): ClauseEntry[] | null {
  if (!metadata.keyTerms && !metadata.riskClauses) return null;
  const quotes = new Map([...(metadata.riskClauses ?? []), ...(metadata.keyTerms ?? []), ...(metadata.eligibility ?? [])].map(t => [t.label, t.text]));
  return CATALOGUE.map(entry => ({ ...entry, quote: quotes.get(entry.label) }));
}
