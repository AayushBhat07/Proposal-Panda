'use client';

/**
 * BOQ Insights tab: the schedule of quantities read from the tender, checked against its own totals, with
 * the few items that carry most of the value and the sub-heads they fall under.
 */

import { useMemo, useState } from 'react';
import type { TenderSummary } from '@/features/summarization/types/summarization.types';
import { boqInsights, rupees, type BoqItem } from '@/features/summarization/services/boq';

const inr = (n: number) => `₹ ${Math.round(n).toLocaleString('en-IN')}`;
const crore = (n: number) => `₹ ${(n / 1e7).toLocaleString('en-IN', { maximumFractionDigits: 2, minimumFractionDigits: 2 })} cr`;
const pct = (part: number, whole: number) => `${((part / whole) * 100).toFixed(part / whole < 0.1 ? 1 : 0)}%`;

export default function BOQInsightsPanel({ metadata }: { metadata: TenderSummary['metadata'] }) {
  const parts = metadata.boq;
  const insights = useMemo(() => (parts?.length ? boqInsights(parts) : null), [parts]);

  if (!parts) {
    return (
      <p role="status" className="border-l-2 border-ochre bg-ochre-tint px-4 py-3 text-sm text-ink">
        This tender was analysed before the BOQ was read. Upload it again to see its schedule of quantities here.
      </p>
    );
  }
  if (!insights) {
    return (
      <div className="flex max-w-2xl flex-col gap-3">
        <h2 className="font-serif text-xl font-semibold text-ink">No schedule of quantities in this document</h2>
        <p className="text-sm leading-relaxed text-ink-soft">
          Many tenders publish the BOQ as a separate Excel file on the e-procurement portal. Download it from the
          portal and keep it with the bid: Cover II is quoted against it. If the BOQ is a scanned page in this
          document, it can&apos;t be read as a table.
        </p>
      </div>
    );
  }

  const estimated = rupees(metadata.estimatedCost);
  const reference = insights.statedTotal ?? estimated;
  const top = insights.bySection[0]?.amount ?? 1;

  return (
    <div className="flex flex-col gap-12">
      <dl className="grid grid-cols-2 gap-px border border-rule-strong bg-rule-strong sm:grid-cols-4">
        <Stat label="Items read" value={insights.itemCount.toLocaleString('en-IN')} note={`${parts.length} ${parts.length === 1 ? 'schedule' : 'schedules'}`} />
        <Stat label="Value of items read" value={crore(insights.total)} note={inr(insights.total)} />
        <Stat
          label="Tender's own total"
          value={insights.statedTotal ? crore(insights.statedTotal) : 'Not printed'}
          note={insights.statedTotal ? `${pct(insights.total, insights.statedTotal)} of it read` : undefined}
        />
        <Stat
          label="Estimated cost (NIT)"
          value={estimated ? crore(estimated) : 'Not found'}
          note={estimated && insights.statedTotal ? (Math.abs(insights.statedTotal - estimated) < 100 ? 'Matches the BOQ total' : `BOQ total is ${pct(insights.statedTotal, estimated)} of it`) : undefined}
        />
      </dl>

      {reference && insights.total < reference * 0.98 && (
        <p role="status" className="-mt-6 border-l-2 border-ochre bg-ochre-tint px-4 py-3 text-sm text-ink">
          About {pct(reference - insights.total, reference)} of the value wasn&apos;t read, usually rows broken across
          pages or printed as images. Check the totals against the tender before relying on them.
        </p>
      )}

      <div className="flex flex-wrap items-start gap-12">
        <section aria-labelledby="boq-major" className="flex min-w-0 max-w-[720px] flex-[999_1_520px] flex-col gap-3">
          <h2 id="boq-major" className="font-serif text-xl font-semibold text-ink">
            Where the money is
          </h2>
          <p className="text-sm leading-relaxed text-pretty text-ink-soft">
            {insights.majorItems.length} of {insights.itemCount} items make up 80% of the value. Get firm supplier
            quotes for these before deciding the percentage or rates to quote; small errors here move the whole bid.
          </p>
          <ol>
            {insights.majorItems.slice(0, 15).map(item => (
              <ItemRow key={`${item.section}-${item.no}`} item={item} total={insights.total} />
            ))}
          </ol>
          {insights.majorItems.length > 15 && (
            <p className="text-sm text-muted">and {insights.majorItems.length - 15} more in the full schedule below.</p>
          )}
        </section>

        <aside className="flex flex-[1_1_300px] flex-col gap-8">
          <section aria-labelledby="boq-sections">
            <h2 id="boq-sections" className="mb-3 border-b border-dotted border-rule-strong pb-2 font-mono text-xs font-medium tracking-widest text-muted">
              VALUE BY SUB-HEAD
            </h2>
            <ul className="flex flex-col gap-3">
              {insights.bySection.slice(0, 12).map(s => (
                <li key={s.section} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink" title={s.section}>
                      {s.section}
                    </span>
                    <span className="flex-none font-mono text-xs text-ink-soft tabular-nums">{pct(s.amount, insights.total)}</span>
                  </div>
                  <div className="h-1.5 bg-rule" aria-hidden>
                    <div className="h-1.5 bg-forest" style={{ width: `${(s.amount / top) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
            {insights.bySection.length > 12 && <p className="mt-3 text-xs text-muted">{insights.bySection.length - 12} smaller sub-heads not shown.</p>}
          </section>

          <section aria-labelledby="boq-checks">
            <h2 id="boq-checks" className="mb-2 border-b border-dotted border-rule-strong pb-2 font-mono text-xs font-medium tracking-widest text-muted">
              CHECKS
            </h2>
            <ul className="flex flex-col gap-2 text-sm leading-relaxed text-ink-soft">
              <li>
                {insights.arithmetic.length
                  ? `${insights.arithmetic.length} ${insights.arithmetic.length === 1 ? 'row' : 'rows'} where quantity × rate doesn't give the amount printed: ${insights.arithmetic.map(i => i.no).join(', ')}. Raise as a pre-bid query.`
                  : 'Quantity × rate gives the printed amount on every row read.'}
              </li>
              {insights.lumpSum.length > 0 && (
                <li>
                  {insights.lumpSum.length} lump-sum or job items ({insights.lumpSum.map(i => i.no).join(', ')}): price these from the
                  specification, as there is no quantity to check against.
                </li>
              )}
              <li>
                The rates shown are the department&apos;s estimate. In a percentage-rate tender you quote one percentage above or
                below them; in an item-rate tender you quote your own rate for every item.
              </li>
            </ul>
          </section>
        </aside>
      </div>

      <FullSchedule parts={parts} />
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 bg-sheet p-4">
      <dt className="font-mono text-[11px] tracking-widest text-muted uppercase">{label}</dt>
      <dd className="font-serif text-2xl text-ink tabular-nums">{value}</dd>
      {note && <dd className="text-xs text-ink-soft">{note}</dd>}
    </div>
  );
}

function ItemRow({ item, total }: { item: BoqItem; total: number }) {
  return (
    <li className="flex gap-4 border-b border-dotted border-rule-strong py-3">
      <span className="w-16 flex-none pt-0.5 font-mono text-xs text-muted">{item.no}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="line-clamp-2 text-[15px] text-ink" title={item.description}>
          {item.description}
        </p>
        <p className="font-mono text-xs text-ink-soft tabular-nums">
          {item.quantity.toLocaleString('en-IN')} {item.unit} × {inr(item.rate)}
          {item.section && <span className="font-sans text-muted"> · {item.section}</span>}
        </p>
      </div>
      <div className="flex-none text-right">
        <p className="font-mono text-sm text-ink tabular-nums">{inr(item.amount)}</p>
        <p className="font-mono text-xs text-muted tabular-nums">{pct(item.amount, total)}</p>
      </div>
    </li>
  );
}

function FullSchedule({ parts }: { parts: NonNullable<TenderSummary['metadata']['boq']> }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  return (
    <details className="border border-rule-strong bg-sheet">
      <summary className="flex min-h-11 cursor-pointer items-center px-5 font-medium text-ink">Full schedule of quantities</summary>
      <div className="flex flex-col gap-6 border-t border-rule px-5 py-5">
        <label className="flex max-w-md flex-col gap-1.5 text-sm text-ink-soft">
          Search items
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="e.g. reinforcement, cable, plaster"
            className="min-h-11 border border-rule-strong bg-paper px-3 text-ink"
          />
        </label>
        {parts.map(part => {
          const rows = q ? part.items.filter(i => `${i.no} ${i.description} ${i.section ?? ''}`.toLowerCase().includes(q)) : part.items;
          return (
            <div key={part.title} className="flex flex-col gap-2">
              <h3 className="font-serif text-lg text-ink">
                {part.title} <span className="text-sm text-muted">({rows.length} items)</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-ink text-left font-mono text-[11px] tracking-widest text-muted uppercase">
                      <th scope="col" className="py-2 pr-3 font-medium">No.</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Description</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Qty</th>
                      <th scope="col" className="py-2 pr-3 font-medium">Unit</th>
                      <th scope="col" className="py-2 pr-3 text-right font-medium">Rate</th>
                      <th scope="col" className="py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((item, i) => (
                      <tr key={`${item.no}-${i}`} className="border-b border-dotted border-rule-strong align-top">
                        <td className="py-2 pr-3 font-mono text-xs text-muted">{item.no}</td>
                        <td className="max-w-md py-2 pr-3 text-ink">
                          <span className="line-clamp-3" title={item.description}>
                            {item.description}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{item.quantity.toLocaleString('en-IN')}</td>
                        <td className="py-2 pr-3 text-ink-soft">{item.unit}</td>
                        <td className="py-2 pr-3 text-right font-mono tabular-nums">{item.rate.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right font-mono tabular-nums">{Math.round(item.amount).toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </details>
  );
}
