/** Browser-side calls for the office's shared data. Everything here lives in the database, not this browser. */

import type { OnboardingState } from '@/types/onboarding.types';
import type { KeyDate } from '@/features/summarization/services/dates';

async function call<T>(url: string, init?: { method: string; body: unknown }): Promise<T> {
  const response = await fetch(url, {
    cache: 'no-store',
    ...(init && {
      method: init.method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(init.body),
    }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'The office server did not answer. Check it is running and try again.');
  return data as T;
}

export interface Register<R, B> {
  reports: R[];
  bids: B[];
  stages: Record<string, string>;
}

export const fetchRegister = <R, B>() => call<Register<R, B>>('/api/tenders');

export const fetchTender = <R, B>(id: string) =>
  call<{ report: R; bid: B | null; stage: string | null; hasFile: boolean }>(`/api/tenders/${encodeURIComponent(id)}`);

export const saveKeyDates = (id: string, keyDates: KeyDate[]) =>
  call(`/api/tenders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { keyDates } });

export const saveStage = (id: string, stage: string | null) =>
  call(`/api/tenders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { stage } });

export const saveBid = (id: string, bid: unknown) =>
  call(`/api/tenders/${encodeURIComponent(id)}/bid`, { method: 'PUT', body: { bid } });

export const fetchCompany = () => call<OnboardingState>('/api/company');

export const saveCompany = (state: OnboardingState) => call<OnboardingState>('/api/company', { method: 'PUT', body: state });

export const fetchAnswers = () => call<{ answers: Record<string, string> }>('/api/answers').then(d => d.answers);

export const saveAnswers = (answers: Record<string, string>) =>
  call<{ answers: Record<string, string> }>('/api/answers', { method: 'PUT', body: { answers } }).then(d => d.answers);
