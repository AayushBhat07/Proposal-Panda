'use client';

/**
 * Shows analysis and bid runs from any page: a small pill while one runs elsewhere,
 * a toast when it finishes, and a warning before a reload would cut it off.
 */

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CheckCircle2, HardHat, X, XCircle } from 'lucide-react';
import { useJobsStore } from '@/state/jobsStore';

const DONE_TOAST_MS = 10_000;

export default function RunTracker() {
  const pathname = usePathname();
  const jobs = useJobsStore(state => state.jobs);
  const toasts = useJobsStore(state => state.toasts);
  const dismissToast = useJobsStore(state => state.dismissToast);
  const running = Object.values(jobs).filter(job => job.status === 'running');

  // Nothing to announce when the user is already looking at the result.
  useEffect(() => {
    toasts.filter(t => t.href === pathname).forEach(t => dismissToast(t.id));
  }, [toasts, pathname, dismissToast]);

  useEffect(() => {
    const timers = toasts.filter(t => t.tone === 'done').map(t => setTimeout(() => dismissToast(t.id), DONE_TOAST_MS));
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismissToast]);

  // The run lives in this tab: a reload or close ends it before the result is saved.
  const isRunning = running.length > 0;
  useEffect(() => {
    if (!isRunning) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isRunning]);

  const elsewhere = running.filter(job => job.livePath !== pathname);
  const visibleToasts = toasts.filter(t => t.href !== pathname);
  if (elsewhere.length === 0 && visibleToasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto z-50 flex flex-col items-stretch sm:items-end gap-2">
      {elsewhere.map(job => (
        <Link
          key={job.livePath}
          href={job.livePath}
          className="flex items-center gap-2 self-end border border-rule-strong bg-sheet px-3 py-2 text-sm text-ink shadow-sm hover:bg-paper"
        >
          <HardHat className="h-4 w-4 text-ochre motion-safe:animate-pulse" aria-hidden />
          <span className="truncate max-w-64">
            {job.pipeline === 'analysis' ? 'Analysing' : 'Drafting bid for'} {job.title}
          </span>
        </Link>
      ))}
      <div role="status" aria-live="polite" className="flex flex-col items-stretch sm:items-end gap-2">
        {visibleToasts.map(t => (
          <div
            key={t.id}
            className={`flex items-start gap-3 border-l-2 bg-sheet px-4 py-3 text-sm text-ink shadow-md sm:max-w-sm ${
              t.tone === 'done' ? 'border-forest' : 'border-seal'
            }`}
          >
            {t.tone === 'done' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-seal" aria-hidden />
            )}
            <div className="flex flex-col gap-1 min-w-0">
              <p className="break-words">{t.text}</p>
              <Link href={t.href} onClick={() => dismissToast(t.id)} className="font-medium text-forest underline underline-offset-2">
                {t.linkText}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss"
              className="-m-1 ml-auto shrink-0 p-1 text-muted hover:text-ink"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
