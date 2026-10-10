'use client';

/**
 * Summary tab: the sections produced by the analysis pipeline, read as a memo with the
 * money and dates in the margin.
 */

import type { TenderSummary } from '@/features/summarization/types/summarization.types';

type SectionKey = keyof Omit<TenderSummary, 'metadata' | 'sourceText'>;

const MEMO: Array<{ key: SectionKey; title: string }> = [
  { key: 'executiveSummary', title: 'What they want' },
  { key: 'technicalScope', title: 'Technical scope' },
  { key: 'eligibilityAndClauses', title: 'Who can bid, and key clauses' },
  { key: 'legalHighlights', title: 'Legal highlights' },
  { key: 'attentionPoints', title: 'Points to watch' },
];

const MARGIN: Array<{ key: SectionKey; title: string }> = [
  { key: 'commercialTerms', title: 'MONEY AND TERMS' },
  { key: 'datesAndObligations', title: 'DATES AND OBLIGATIONS' },
];

export default function SummaryPanel({ summary }: { summary: TenderSummary }) {
  const modelUsed = summary.metadata?.modelUsed;
  return (
    <div className="flex flex-col gap-8">
      {modelUsed?.includes('extractive') && (
        <p role="status" className="border-l-2 border-ochre bg-ochre-tint px-4 py-3 text-sm text-ink">
          Some sections are keyword extracts because the local analysis model didn&apos;t respond. Check that
          Ollama is running and re-upload for full summaries.
        </p>
      )}
      <div className="flex flex-wrap items-start gap-12">
        <article className="flex min-w-0 max-w-[680px] flex-[999_1_520px] flex-col gap-7">
          {MEMO.map(({ key, title }) => (
            <section key={key}>
              <h2 className="mb-2 font-serif text-xl font-semibold text-ink">{title}</h2>
              <p className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-ink">
                {summary[key] || 'Not specified in the tender.'}
              </p>
            </section>
          ))}
          {modelUsed && <p className="text-sm text-muted">Summarised by {modelUsed}</p>}
        </article>
        <aside className="flex flex-[1_1_300px] flex-col gap-8">
          {MARGIN.map(({ key, title }) => (
            <section key={key}>
              <h2 className="mb-2 border-b border-dotted border-rule-strong pb-2 font-mono text-xs font-medium tracking-widest text-muted">
                {title}
              </h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-soft">
                {summary[key] || 'Not specified in the tender.'}
              </p>
            </section>
          ))}
        </aside>
      </div>
    </div>
  );
}
