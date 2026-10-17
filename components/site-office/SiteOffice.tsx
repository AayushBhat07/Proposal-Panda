'use client';

import type { Pipeline, ProgressEvent } from '@/lib/progress/events';

export interface SiteOfficeProps {
  pipeline: Pipeline;
  /** Every progress event received so far, in order. */
  events: ProgressEvent[];
  /** Shown in the heading, e.g. the uploaded file name or tender title. */
  title: string;
  /** Set when the run failed; the crew stops and the message shows. */
  error?: string | null;
}

/** Stub: a plain list of steps. Replaced by the animated office. */
export default function SiteOffice({ events, title, error }: SiteOfficeProps) {
  return (
    <div role="status" className="border border-rule-strong bg-sheet p-6">
      <p className="font-serif text-xl text-ink mb-3 break-all">{title}</p>
      <ul className="text-sm text-muted space-y-1">
        {events.map((e, i) => (
          <li key={i}>
            {e.label ?? e.step}: {e.status}
            {e.detail ? `, ${e.detail}` : ''}
          </li>
        ))}
      </ul>
      {error && <p className="mt-3 text-sm text-seal">{error}</p>}
    </div>
  );
}
