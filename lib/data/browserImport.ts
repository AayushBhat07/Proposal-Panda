/**
 * Moves what this browser stored before the office database existed into it, once. Each part is removed
 * from the browser only after the server took it; parts this user's role can't add stay for someone who can.
 * GSTIN and PAN from an old company profile never go to the server: bids are scrubbed to tokens first, and the
 * numbers wait here until the vault takes them in.
 */

import { scrubIdentifiers } from '@/lib/vault/bidVault';

const PREFIX = 'tender-app-';
const KEYS = {
  reports: `${PREFIX}intelligenceReports`,
  bids: `${PREFIX}foundationBids`,
  stages: `${PREFIX}tenderStages`,
  answers: `${PREFIX}blankAnswers`,
  company: 'onboardingState',
} as const;
type Part = keyof typeof KEYS;

/** Leftovers from the old browser-only app that nothing reads any more. */
const OBSOLETE = [`${PREFIX}tenders`, `${PREFIX}dataSeeded`, `${PREFIX}latestTenderId`, `${PREFIX}currentUser`];
const LEGACY_IDS = 'proposalpanda-legacy-identifiers';

export interface LegacyIdentifiers {
  gstin?: string;
  panNumber?: string;
}

function read(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/** GSTIN and PAN from a company profile saved before the vault, waiting for the vault to take them in. */
export function legacyIdentifiers(): LegacyIdentifiers | null {
  const ids = read(LEGACY_IDS) as LegacyIdentifiers | null;
  return ids?.gstin || ids?.panNumber ? ids : null;
}

export function clearLegacyIdentifiers() {
  localStorage.removeItem(LEGACY_IDS);
}

let running: Promise<void> | null = null;

/** Safe to call on every page load: does nothing once the browser holds no old data. */
export function importBrowserData(): Promise<void> {
  running ??= run().finally(() => (running = null));
  return running;
}

async function run() {
  try {
    OBSOLETE.forEach(key => localStorage.removeItem(key));
  } catch {
    return; // storage blocked: there is nothing to import either
  }

  const company = read(KEYS.company) as { companyProfile?: Record<string, unknown> | null; isComplete?: boolean } | null;
  const { gstin, panNumber, ...profile } = (company?.companyProfile ?? {}) as LegacyIdentifiers & Record<string, unknown>;
  if (gstin || panNumber) localStorage.setItem(LEGACY_IDS, JSON.stringify({ gstin, panNumber }));
  const legacy = legacyIdentifiers() ?? {};

  const bids = read(KEYS.bids) as Array<{ sections?: Array<{ content: string }> }> | null;
  const answers = read(KEYS.answers) as Array<{ id: string; answers: Record<string, string> }> | null;
  const payload: Partial<Record<Part, unknown>> = {
    reports: read(KEYS.reports) ?? undefined,
    bids: bids?.map(bid => ({
      ...bid,
      sections: bid.sections?.map(s => ({ ...s, content: scrubIdentifiers(s.content, legacy) })),
    })),
    stages: read(KEYS.stages) ?? undefined,
    answers: answers?.find(a => a.id === 'company')?.answers,
    company: company?.companyProfile ? { companyProfile: profile, isComplete: !!company.isComplete } : undefined,
  };
  const parts = (Object.keys(payload) as Part[]).filter(part => payload[part] !== undefined);
  if (!parts.length) return;

  const response = await fetch('/api/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!response.ok) return; // try again on the next load
  const { refused } = (await response.json()) as { refused: Part[] };
  for (const part of parts) if (!refused.includes(part)) localStorage.removeItem(KEYS[part]);
}
