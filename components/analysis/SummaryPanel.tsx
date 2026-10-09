'use client';

/**
 * Summary tab: the six sections produced by the analysis pipeline.
 */

import type { TenderSummary } from '@/features/summarization/types/summarization.types';

const SECTIONS: Array<{ key: keyof Omit<TenderSummary, 'metadata'>; title: string }> = [
  { key: 'executiveSummary', title: 'Executive Summary' },
  { key: 'commercialTerms', title: 'Commercial Terms' },
  { key: 'datesAndObligations', title: 'Dates and Obligations' },
  { key: 'technicalScope', title: 'Technical Scope' },
  { key: 'legalHighlights', title: 'Legal Highlights' },
  { key: 'attentionPoints', title: 'Attention Points' },
];

export default function SummaryPanel({ summary }: { summary: TenderSummary }) {
  const modelUsed = summary.metadata?.modelUsed;
  return (
    <div className="p-6 space-y-6">
      {modelUsed === 'extractive-fallback' && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-sm text-amber-900">
          The local analysis model wasn&apos;t reachable, so these sections are keyword extracts from the document.
          Start Ollama and re-upload for model summaries.
        </div>
      )}
      {SECTIONS.map(({ key, title }) => (
        <div key={key} className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
            {summary[key] || 'Not specified in the tender.'}
          </p>
        </div>
      ))}
      {modelUsed && <p className="text-xs text-gray-500">Summarised by {modelUsed}</p>}
    </div>
  );
}
