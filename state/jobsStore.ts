'use client';

/**
 * Analysis and bid runs live here, not in their pages, so they keep going when the user moves to another
 * page. The server saves each result to the office database; a toast says when one finishes.
 * A full reload or closed tab still ends the run in this browser; see RunTracker's unload warning.
 */

import { create } from 'zustand';
import type { FoundationBid } from '@/features/bid-generation';
import type { Pipeline, ProgressEvent } from '@/lib/progress/events';
import { readProgressStream } from '@/lib/progress/stream';

export interface Job {
  pipeline: Pipeline;
  /** e.g. the file name or tender title. */
  title: string;
  /** The page with the result. */
  href: string;
  /** The page that shows the run while it's going. */
  livePath: string;
  status: 'running' | 'done' | 'error';
  events: ProgressEvent[];
  error: string | null;
}

export interface Toast {
  id: number;
  text: string;
  href: string;
  linkText: string;
  tone: 'done' | 'error';
}

/** One analysis at a time (the register has one upload box); one bid run per tender. */
export const ANALYSIS_JOB = 'analysis';
export const bidJobKey = (tenderId: string) => `bid:${tenderId}`;

interface JobsStore {
  jobs: Record<string, Job>;
  toasts: Toast[];
  startAnalysis: (file: File) => void;
  startBid: (tenderId: string, title: string) => void;
  clearJob: (key: string) => void;
  dismissToast: (id: number) => void;
}

let toastId = 0;

export const useJobsStore = create<JobsStore>((set, get) => {
  const patch = (key: string, change: Partial<Job>) =>
    set(state => (state.jobs[key] ? { jobs: { ...state.jobs, [key]: { ...state.jobs[key], ...change } } } : state));

  const toast = (t: Omit<Toast, 'id'>) => set(state => ({ toasts: [...state.toasts, { ...t, id: ++toastId }] }));

  async function run<T>(key: string, job: Omit<Job, 'status' | 'events' | 'error'>, request: () => Promise<Response>) {
    set(state => ({ jobs: { ...state.jobs, [key]: { ...job, status: 'running', events: [], error: null } } }));
    const what = job.pipeline === 'analysis' ? `Analysis of ${job.title}` : `Bid for ${job.title}`;
    try {
      await readProgressStream<T>(await request(), event =>
        patch(key, { events: [...(get().jobs[key]?.events ?? []), event] })
      );
      patch(key, { status: 'done' });
      toast({ text: `${what} is ready.`, href: job.href, linkText: job.pipeline === 'analysis' ? 'Open report' : 'Open bid', tone: 'done' });
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      patch(key, { status: 'error', error });
      toast({ text: `${what} stopped: ${error}`, href: job.livePath, linkText: 'See details', tone: 'error' });
    }
  }

  return {
    jobs: {},
    toasts: [],

    startAnalysis: file => {
      const tenderId = `TENDER-${Date.now()}`;
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenderId', tenderId);
      formData.append('tenderTitle', file.name.replace(/\.(pdf|docx)$/i, ''));
      void run<Record<string, unknown>>(
        ANALYSIS_JOB,
        { pipeline: 'analysis', title: file.name, href: `/tenders/${tenderId}/analysis`, livePath: '/register' },
        () => fetch('/api/intelligence/run', { method: 'POST', body: formData })
      );
    },

    startBid: (tenderId, title) =>
      void run<FoundationBid>(
        bidJobKey(tenderId),
        { pipeline: 'bid', title, href: `/tenders/${tenderId}/bid`, livePath: `/tenders/${tenderId}/bid` },
        () =>
          fetch('/api/bid/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tenderId }),
          })
      ),

    clearJob: key =>
      set(state => {
        const jobs = { ...state.jobs };
        delete jobs[key];
        return { jobs };
      }),

    dismissToast: id => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
  };
});
