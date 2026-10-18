'use client';

/**
 * The tender's key dates under the title: bid due, opening, pre-bid meeting, last date for queries, each with
 * a countdown. Dates read from the NIT can be corrected here when a corrigendum moves them.
 */

import { useState } from 'react';
import { CalendarClock, Pencil } from 'lucide-react';
import Button from '@/components/ui/Button';
import { KEY_DATE_LABELS, countdown, daysUntil, formatKeyDate, type KeyDate, type KeyDateKind } from '@/features/summarization/services/dates';

const KINDS: KeyDateKind[] = ['submission', 'opening', 'preBid', 'queries'];

/** Seal inside a week, ochre inside two, quiet once passed. */
export function urgency(date: string): string {
  const days = daysUntil(date);
  if (days < 0) return 'text-muted';
  if (days <= 7) return 'text-seal';
  if (days <= 14) return 'text-ochre';
  return 'text-ink';
}

export default function KeyDates({ dates, onPortal, editable, onSave }: { dates: KeyDate[] | undefined; onPortal?: boolean; editable: boolean; onSave: (dates: KeyDate[]) => void }) {
  const [editing, setEditing] = useState(false);
  const byKind = new Map((dates ?? []).map(d => [d.kind, d]));
  const [draft, setDraft] = useState<Record<KeyDateKind, { date: string; time: string }>>(() =>
    Object.fromEntries(KINDS.map(k => [k, { date: byKind.get(k)?.date ?? '', time: byKind.get(k)?.time ?? '' }])) as Record<KeyDateKind, { date: string; time: string }>
  );

  if (editing) {
    const save = () => {
      onSave(
        KINDS.flatMap(kind => {
          const { date, time } = draft[kind];
          if (!date) return [];
          const old = byKind.get(kind);
          const changed = !old || old.date !== date || (old.time ?? '') !== time;
          return [{ kind, date, time: time || undefined, printed: changed ? 'Entered by hand' : old.printed }];
        })
      );
      setEditing(false);
    };
    return (
      <div className="flex flex-col gap-4 border border-rule-strong bg-sheet p-5">
        <p className="text-sm text-ink-soft">Correct a date when a corrigendum moves it. Leave a date empty if the tender doesn&apos;t have one.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          {KINDS.map(kind => (
            <fieldset key={kind} className="flex flex-col gap-1.5">
              <legend className="mb-1.5 text-sm font-medium text-ink-soft">{KEY_DATE_LABELS[kind]}</legend>
              <div className="flex gap-2">
                <input
                  type="date"
                  aria-label={`${KEY_DATE_LABELS[kind]} date`}
                  value={draft[kind].date}
                  onChange={e => setDraft({ ...draft, [kind]: { ...draft[kind], date: e.target.value } })}
                  className="min-h-11 flex-1 border border-rule-strong bg-paper px-3 text-ink"
                />
                <input
                  type="time"
                  aria-label={`${KEY_DATE_LABELS[kind]} time`}
                  value={draft[kind].time}
                  onChange={e => setDraft({ ...draft, [kind]: { ...draft[kind], time: e.target.value } })}
                  className="min-h-11 w-32 border border-rule-strong bg-paper px-3 text-ink"
                />
              </div>
            </fieldset>
          ))}
        </div>
        <div className="flex gap-3">
          <Button size="sm" onClick={save}>
            Save dates
          </Button>
          <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-start gap-x-8 gap-y-4 border-y border-rule py-4">
      {dates?.length ? (
        dates.map(d => (
          <div key={d.kind} className="flex flex-col gap-0.5" title={`From the tender: “${d.printed}”`}>
            <span className="font-mono text-[11px] tracking-widest text-muted uppercase">{KEY_DATE_LABELS[d.kind]}</span>
            <span className="text-[15px] text-ink tabular-nums">{formatKeyDate(d)}</span>
            <span className={`text-sm font-medium ${urgency(d.date)}`}>{countdown(d.date)}</span>
          </div>
        ))
      ) : (
        <p className="flex items-center gap-2 text-sm text-ink-soft">
          <CalendarClock className="h-4 w-4 text-muted" aria-hidden />
          {onPortal ? 'The tender says its dates are on the CPP portal (eprocure.gov.in).' : dates ? 'No dates were found in the tender text.' : 'This tender was analysed before dates were read.'}{' '}
          {editable ? 'Add the bid due date so it shows on the register.' : ''}
        </p>
      )}
      {editable && (
        <Button variant="ghost" size="sm" className="ml-auto" onClick={() => setEditing(true)}>
          <Pencil className="h-3.5 w-3.5" aria-hidden /> {dates?.length ? 'Correct dates' : 'Add dates'}
        </Button>
      )}
    </div>
  );
}
