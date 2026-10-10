'use client';

/**
 * Compliance tab: score, per-category risk levels and the findings from compliance scoring.
 */

import type { ComplianceScore } from '@/features/compliance-scoring/types/compliance.types';
import { RISK_CHIP, RISK_TEXT } from './risk';

const CATEGORIES: Array<{ key: keyof ComplianceScore['riskCategories']; label: string }> = [
  { key: 'financial', label: 'Financial' },
  { key: 'technical', label: 'Technical' },
  { key: 'legal', label: 'Legal' },
  { key: 'submission', label: 'Submission' },
];

export default function CompliancePanel({ compliance }: { compliance: ComplianceScore }) {
  return (
    <div className="flex flex-wrap items-start gap-12">
      <div className="flex min-w-0 flex-[999_1_520px] flex-col gap-10">
        <FindingsList
          title="Identified risks"
          empty="No risks identified."
          items={compliance.identifiedRisks.map(r => ({ label: r.category, text: r.description, note: r.sourceSection }))}
        />
        <FindingsList
          title="Missing or weak clauses"
          empty="No missing or weak clauses found."
          items={compliance.missingOrWeakClauses.map(c => ({ label: 'Clause', text: c.clause, note: c.reason }))}
        />
        <FindingsList
          title="Submission traps"
          empty="No submission traps found."
          items={compliance.submissionTraps.map(t => ({ label: 'Trap', text: t }))}
        />
      </div>

      <aside className="flex flex-[1_1_300px] flex-col gap-8">
        <section className="flex flex-col gap-3 border border-rule-strong bg-sheet p-5">
          <span className="font-serif text-2xl text-ink">
            {compliance.complianceScore} <span className="text-muted">/ 100</span>
          </span>
          <div className="h-2 bg-rule" aria-hidden>
            <div
              className={`h-2 ${compliance.riskLevel === 'Low' ? 'bg-forest' : compliance.riskLevel === 'Medium' ? 'bg-ochre' : 'bg-seal'}`}
              style={{ width: `${compliance.complianceScore}%` }}
            />
          </div>
          <span className={`text-sm font-medium ${RISK_TEXT[compliance.riskLevel]}`}>
            {compliance.riskLevel} risk overall
          </span>
        </section>

        <section>
          <h2 className="mb-1 font-mono text-xs font-medium tracking-widest text-muted">RISK BY AREA</h2>
          <dl>
            {CATEGORIES.map(({ key, label }) => {
              const level = compliance.riskCategories[key];
              const count = compliance.identifiedRisks.filter(r => r.category === label).length;
              return (
                <div key={key} className="flex items-center justify-between gap-3 border-b border-dotted border-rule-strong py-2.5 text-sm">
                  <dt className="text-ink">
                    {label} <span className="text-muted">· {count} {count === 1 ? 'finding' : 'findings'}</span>
                  </dt>
                  <dd className={`px-2 py-0.5 text-xs font-medium ${RISK_CHIP[level]}`}>{level}</dd>
                </div>
              );
            })}
          </dl>
        </section>

        <section>
          <h2 className="mb-2 font-mono text-xs font-medium tracking-widest text-muted">CONFIDENCE</h2>
          <p className="text-sm leading-relaxed text-ink-soft">{compliance.confidenceNotes}</p>
        </section>
      </aside>
    </div>
  );
}

function FindingsList({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: Array<{ label: string; text: string; note?: string }>;
}) {
  return (
    <section>
      <h2 className="mb-2 font-serif text-xl font-semibold text-ink">
        {title} <span className="font-normal text-muted">({items.length})</span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted">{empty}</p>
      ) : (
        <ol>
          {items.map((item, index) => (
            <li key={index} className="flex gap-4 border-b border-dotted border-rule-strong py-3">
              <span className="w-24 flex-none pt-0.5 font-mono text-xs uppercase text-muted">{item.label}</span>
              <div className="min-w-0">
                <p className="text-[15px] text-ink">{item.text}</p>
                {item.note && <p className="mt-1 text-sm text-muted">{item.note}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
