'use client';

/**
 * Phase 5A: Summary Panel
 * Executive summary tab
 */

export default function SummaryPanel({ summary }: { summary: any }) {
  return (
    <div className="p-6 space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Executive Summary</h3>
        <p className="text-gray-700 leading-relaxed">
          {summary?.executiveSummary || 'The tender is technically viable for your organization based on current machinery and past experience credentials. However, there are significant financial documentation risks regarding the solvency certificate format. The legal framework contains one unusual arbitration clause that requires review. Submission deadlines are tight with physical submission requirements.'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Tender ID</div>
          <div className="text-lg font-semibold text-gray-900">{summary?.tenderId || 'MH-PWD-2024-892'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Bid Value</div>
          <div className="text-lg font-semibold text-gray-900">{summary?.bidValue || '₹24.5 Cr'}</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-2">Submission Date</div>
          <div className="text-lg font-semibold text-gray-900">{summary?.submissionDate || 'Nov 15, 2024'}</div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h4 className="text-sm font-semibold text-gray-900 mb-4">Key Requirements</h4>
        <ul className="space-y-2">
          {(summary?.keyRequirements || [
            'Class I-A PWD registration mandatory',
            'Minimum 3 similar projects in last 5 years',
            'Turnover: ₹75Cr+ in FY 2022-23',
            'EMD: ₹49 lakhs (2% of estimated cost)',
          ]).map((req: string, idx: number) => (
            <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="text-green-600 mt-0.5">✓</span>
              <span>{req}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
