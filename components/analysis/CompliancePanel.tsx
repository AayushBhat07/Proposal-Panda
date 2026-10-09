'use client';

/**
 * Compliance tab: score, per-category risk levels and the findings from compliance scoring.
 */

import type { ComplianceScore, RiskLevel } from '@/features/compliance-scoring/types/compliance.types';

const LEVEL_COLORS: Record<RiskLevel, string> = {
  Low: 'bg-green-50 border-green-200 text-green-700',
  Medium: 'bg-orange-50 border-orange-200 text-orange-700',
  High: 'bg-red-50 border-red-200 text-red-700',
};

const CATEGORIES: Array<{ key: keyof ComplianceScore['riskCategories']; label: string; risk: string }> = [
  { key: 'financial', label: 'Financial', risk: 'Financial' },
  { key: 'technical', label: 'Technical', risk: 'Technical' },
  { key: 'legal', label: 'Legal', risk: 'Legal' },
  { key: 'submission', label: 'Submission', risk: 'Submission' },
];

export default function CompliancePanel({ compliance }: { compliance: ComplianceScore }) {
  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-4">COMPLIANCE SCORE</div>
          <div className="flex items-end gap-2 mb-4">
            <div className="text-5xl font-bold text-gray-900">{compliance.complianceScore}</div>
            <div className="text-2xl text-gray-500 mb-2">/ 100</div>
          </div>
          <span className={`inline-block px-3 py-1 border text-sm font-medium rounded ${LEVEL_COLORS[compliance.riskLevel]}`}>
            {compliance.riskLevel} Risk
          </span>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-4">Confidence Notes</div>
          <p className="text-sm text-gray-700 leading-relaxed">{compliance.confidenceNotes}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Breakdown</h3>
        <div className="grid grid-cols-4 gap-4">
          {CATEGORIES.map(({ key, label, risk }) => {
            const level = compliance.riskCategories[key];
            const count = compliance.identifiedRisks.filter(r => r.category === risk).length;
            return (
              <div key={key} className={`border rounded-lg p-4 ${LEVEL_COLORS[level]}`}>
                <div className="text-xs font-semibold uppercase mb-2">{label}</div>
                <div className="text-2xl font-bold mb-1">{count}</div>
                <div className="text-xs font-medium">{level} risk</div>
              </div>
            );
          })}
        </div>
      </div>

      <FindingsList
        title="Identified Risks"
        empty="No risks identified."
        items={compliance.identifiedRisks.map(r => ({ label: r.category, text: r.description, note: r.sourceSection }))}
      />
      <FindingsList
        title="Missing or Weak Clauses"
        empty="No missing or weak clauses found."
        items={compliance.missingOrWeakClauses.map(c => ({ label: 'Clause', text: c.clause, note: c.reason }))}
      />
      <FindingsList
        title="Submission Traps"
        empty="No submission traps found."
        items={compliance.submissionTraps.map(t => ({ label: 'Trap', text: t }))}
      />
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
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{empty}</p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {items.map((item, index) => (
            <li key={index} className="py-3 flex gap-3 text-sm">
              <span className="px-2 py-0.5 h-fit rounded bg-gray-100 text-gray-700 text-xs font-medium">{item.label}</span>
              <div>
                <div className="text-gray-900">{item.text}</div>
                {item.note && <div className="text-xs text-gray-500 mt-1">{item.note}</div>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
