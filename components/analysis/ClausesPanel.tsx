'use client';

/**
 * Clauses & Legal tab: the contract clauses that change what to quote or what can go wrong, quoted from the
 * tender with what each means, grouped by money, time, legal and submission.
 */

import type { TenderSummary } from '@/features/summarization/types/summarization.types';
import { CLAUSE_GROUPS, clauseRegister } from './clauses';

export default function ClausesPanel({ metadata }: { metadata: TenderSummary['metadata'] }) {
  const register = clauseRegister(metadata);
  if (!register) {
    return (
      <p role="status" className="border-l-2 border-ochre bg-ochre-tint px-4 py-3 text-sm text-ink">
        This tender was analysed before clauses were read from the text. Upload it again to see its clauses here.
      </p>
    );
  }
  const found = register.filter(c => c.quote);
  const missing = register.filter(c => !c.quote);

  return (
    <div className="flex flex-wrap items-start gap-12">
      <div className="flex min-w-0 max-w-[720px] flex-[999_1_520px] flex-col gap-10">
        <p className="text-sm leading-relaxed text-pretty text-ink-soft">
          Each quote is the tender&apos;s own wording, found by text rules rather than the AI model, so it can be
          cited in the bid and in pre-bid queries. Check the page in the tender before relying on it.
        </p>
        {CLAUSE_GROUPS.map(group => {
          const clauses = found.filter(c => c.group === group);
          if (!clauses.length) return null;
          return (
            <section key={group} aria-labelledby={`clauses-${group}`}>
              <h2 id={`clauses-${group}`} className="mb-1 font-serif text-xl font-semibold text-ink">
                {group}
              </h2>
              <ol>
                {clauses.map(clause => (
                  <li key={clause.label} className="flex flex-col gap-2 border-b border-dotted border-rule-strong py-4">
                    <h3 className="text-[15px] font-medium text-ink">{clause.label}</h3>
                    <blockquote className="border-l-2 border-rule-strong pl-4 font-serif text-[17px] leading-relaxed text-ink">
                      &ldquo;{clause.quote}&rdquo;
                    </blockquote>
                    <p className="text-sm leading-relaxed text-ink-soft">{clause.meaning}</p>
                  </li>
                ))}
              </ol>
            </section>
          );
        })}
        {!found.length && <p className="text-sm text-muted">None of the usual contract clauses were found in the tender text.</p>}
      </div>

      <aside className="flex flex-[1_1_280px] flex-col gap-8">
        <section>
          <h2 className="mb-2 border-b border-dotted border-rule-strong pb-2 font-mono text-xs font-medium tracking-widest text-muted">
            FOUND IN THE TENDER
          </h2>
          <p className="font-serif text-3xl text-ink">
            {found.length} <span className="text-muted">of {register.length}</span>
          </p>
        </section>
        {missing.length > 0 && (
          <section>
            <h2 className="mb-2 border-b border-dotted border-rule-strong pb-2 font-mono text-xs font-medium tracking-widest text-muted">
              NOT FOUND IN THE TEXT
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm text-ink-soft">
              {missing.map(c => (
                <li key={c.label}>{c.label}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              The clause may be absent, in a scanned page, or printed only in a table. Search the tender before
              assuming it doesn&apos;t apply, and raise it as a pre-bid query if it matters.
            </p>
          </section>
        )}
      </aside>
    </div>
  );
}
