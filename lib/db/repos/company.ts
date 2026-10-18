/** The office's company file and the saved answers to bid blanks: one of each, shared by everyone. */

import { eq } from 'drizzle-orm';
import type { Db } from '../open';
import { blankAnswers, companyProfile } from '../schema';
import type { OnboardingState } from '@/types/onboarding.types';

const EMPTY: OnboardingState = { companyProfile: null, isComplete: false };

/** GSTIN and PAN belong in the vault, never in the database in the clear. */
function withoutIdentifiers(state: OnboardingState): OnboardingState {
  if (!state.companyProfile) return state;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { gstin, panNumber, ...profile } = state.companyProfile;
  return { ...state, companyProfile: profile };
}

export function getCompany(db: Db): OnboardingState {
  return (db.select().from(companyProfile).where(eq(companyProfile.id, 1)).get()?.data as OnboardingState) ?? EMPTY;
}

export function hasCompany(db: Db): boolean {
  return !!db.select().from(companyProfile).where(eq(companyProfile.id, 1)).get();
}

export function saveCompany(db: Db, state: OnboardingState, by: string): OnboardingState {
  const data = withoutIdentifiers({ companyProfile: state.companyProfile ?? null, isComplete: !!state.isComplete });
  const updatedAt = new Date().toISOString();
  db.insert(companyProfile)
    .values({ id: 1, data, updatedBy: by, updatedAt })
    .onConflictDoUpdate({ target: companyProfile.id, set: { data, updatedBy: by, updatedAt } })
    .run();
  return data;
}

export function getAnswers(db: Db): Record<string, string> {
  return (db.select().from(blankAnswers).where(eq(blankAnswers.id, 'company')).get()?.answers as Record<string, string>) ?? {};
}

/** Merges new answers into the saved ones. */
export function saveAnswers(db: Db, answers: Record<string, string>, by: string): Record<string, string> {
  const merged = { ...getAnswers(db), ...stringsOnly(answers) };
  const updatedAt = new Date().toISOString();
  db.insert(blankAnswers)
    .values({ id: 'company', answers: merged, updatedBy: by, updatedAt })
    .onConflictDoUpdate({ target: blankAnswers.id, set: { answers: merged, updatedBy: by, updatedAt } })
    .run();
  return merged;
}

const stringsOnly = (value: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(value ?? {}).filter(([, v]) => typeof v === 'string')) as Record<string, string>;
