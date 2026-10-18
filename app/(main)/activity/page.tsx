'use client';

/**
 * Admin only: who did what, newest first. Written by the server; nobody can edit or delete an entry.
 */

import { useEffect, useState } from 'react';
import Spinner from '@/components/ui/Spinner';
import type { AuditEntry } from '@/lib/db/repos/audit';

const when = (iso: string) => new Date(iso).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });

export default function ActivityPage() {
  const [entries, setEntries] = useState<AuditEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/audit', { cache: 'no-store' })
      .then(r => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then(data => setEntries(data.entries), () => setError('Could not load the activity log.'));
  }, []);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 pt-8 pb-24 sm:px-8 lg:px-14">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-muted">ACTIVITY</span>
        <h1 className="font-serif text-4xl leading-tight text-balance text-ink">Who did what</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-pretty text-ink-soft">
          Sign-ins, analyses, bids, user changes and vault use, newest first. The server writes these and nobody can
          change or remove them. Vault entries name the document type, never the file.
        </p>
      </div>
      {error && (
        <p role="alert" className="border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
          {error}
        </p>
      )}
      {!entries && !error && <Spinner size="lg" className="text-forest" />}
      {entries && (
        <ol className="flex flex-col">
          {entries.map(entry => (
            <li key={entry.id} className="flex flex-wrap gap-x-4 border-b border-dotted border-rule-strong py-2 text-sm">
              <span className="w-44 font-mono text-xs text-muted">{when(entry.at)}</span>
              <span className="min-w-56 text-ink">{entry.userEmail}</span>
              <span className="text-ink-soft">
                {entry.action}
                {entry.target && entry.target !== 'vault' ? ` ${entry.target}` : ''}
                {entry.detail ? `: ${entry.detail}` : ''}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
