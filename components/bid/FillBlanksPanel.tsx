'use client';

/**
 * Fill a blank once and every place it appears in the bid gets the answer. Answers to company details are
 * remembered, so the next bid can be filled from them in one click.
 */

import { useState } from 'react';
import Button from '@/components/ui/Button';

export type BlankFill = { blank: string; value: string };

interface FillBlanksPanelProps {
  blanks: Array<{ blank: string; count: number }>;
  saved: Record<string, string>;
  onFill: (fills: BlankFill[]) => void;
}

export default function FillBlanksPanel({ blanks, saved, onFill }: FillBlanksPanelProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const valueOf = (blank: string) => values[blank] ?? saved[blank] ?? '';
  const fromSaved = blanks.filter(({ blank }) => saved[blank]).map(({ blank }) => ({ blank, value: saved[blank] }));

  if (blanks.length === 0) return null;

  return (
    <section aria-labelledby="fill-blanks" className="border border-rule-strong bg-sheet">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-6 py-4">
        <div className="flex flex-col gap-1">
          <h2 id="fill-blanks" className="font-serif text-xl text-ink">
            Fill once, use everywhere
          </h2>
          <p className="text-sm text-ink-soft">Each answer fills that blank in every section it appears in.</p>
        </div>
        {fromSaved.length > 0 && (
          <Button size="sm" onClick={() => onFill(fromSaved)}>
            Fill {fromSaved.length} from saved answers
          </Button>
        )}
      </div>
      <ul className="px-6 py-2">
        {blanks.map(({ blank, count }) => {
          const id = `fill-${blank.replace(/\W+/g, '-')}`;
          const value = valueOf(blank).trim();
          return (
            <li key={blank} className="flex flex-wrap items-center gap-3 border-b border-dotted border-rule-strong py-2.5 last:border-0">
              <label htmlFor={id} className="flex min-w-48 flex-1 flex-col">
                <span className="font-mono text-sm text-ochre">{blank}</span>
                <span className="text-xs text-muted">
                  {count === 1 ? '1 place' : `${count} places`}
                  {saved[blank] ? ' · saved answer' : ''}
                </span>
              </label>
              <input
                id={id}
                value={valueOf(blank)}
                onChange={e => setValues({ ...values, [blank]: e.target.value })}
                onKeyDown={e => e.key === 'Enter' && value && onFill([{ blank, value }])}
                className="min-h-11 flex-[2_1_220px] border border-rule-strong bg-paper px-3 text-sm text-ink"
              />
              <Button size="sm" variant="outline" disabled={!value} onClick={() => onFill([{ blank, value }])}>
                Fill
              </Button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
