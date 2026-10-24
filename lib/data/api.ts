/** Browser-side calls for the office's shared data. Everything here lives in the database, not this browser. */

import type { OnboardingState } from '@/types/onboarding.types';
import type { KeyDate } from '@/features/summarization/services/dates';
import type { Stage, StoredBid, StoredReport } from '@/lib/tenders/pipeline';

/** fetch for the office server: throws the server's error message, or says it isn't answering. 404 passes through when asked. */
export async function officeFetch(url: string, init?: RequestInit, { allow404 = false } = {}): Promise<Response> {
  const response = await fetch(url, { cache: 'no-store', ...init });
  if (!response.ok && !(allow404 && response.status === 404)) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'The office server did not answer. Check it is running and try again.');
  }
  return response;
}

export const jsonBody = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

async function call<T>(url: string, init?: { method: string; body: unknown }): Promise<T> {
  const response = await officeFetch(url, init && jsonBody(init.method, init.body));
  return (await response.json().catch(() => ({}))) as T;
}

export interface Register {
  reports: StoredReport[];
  bids: StoredBid[];
  stages: Record<string, Stage>;
}

export const fetchRegister = () => call<Register>('/api/tenders');

export const fetchTender = <R, B>(id: string) =>
  call<{ report: R; bid: B | null; stage: string | null; hasFile: boolean }>(`/api/tenders/${encodeURIComponent(id)}`);

export const saveKeyDates = (id: string, keyDates: KeyDate[]) =>
  call(`/api/tenders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { keyDates } });

export const saveStage = (id: string, stage: Stage | null) =>
  call(`/api/tenders/${encodeURIComponent(id)}`, { method: 'PATCH', body: { stage } });

export const saveBid = (id: string, bid: unknown) =>
  call(`/api/tenders/${encodeURIComponent(id)}/bid`, { method: 'PUT', body: { bid } });

export const fetchCompany = () => call<OnboardingState>('/api/company');

export const saveCompany = (state: OnboardingState) => call<OnboardingState>('/api/company', { method: 'PUT', body: state });

export const fetchAnswers = () => call<{ answers: Record<string, string> }>('/api/answers').then(d => d.answers);

export const saveAnswers = (answers: Record<string, string>) =>
  call<{ answers: Record<string, string> }>('/api/answers', { method: 'PUT', body: { answers } }).then(d => d.answers);
