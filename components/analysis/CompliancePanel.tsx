'use client';

/**
 * Phase 5A: Compliance Panel
 * Compliance score and risk breakdown
 */

export default function CompliancePanel({ compliance }: { compliance: any }) {
  const score = compliance?.complianceScore || 72;
  const riskLevel = compliance?.riskLevel || 'Moderate Risk';

  return (
    <div className="p-6 space-y-6">
      {/* Score Card */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-4">OVERALL FEASIBILITY SCORE</div>
          <div className="flex items-end gap-2 mb-4">
            <div className="text-5xl font-bold text-gray-900">{score}</div>
            <div className="text-2xl text-gray-500 mb-2">/ 100</div>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-100 text-orange-700 text-sm font-medium rounded">
            <span>⚠️</span>
            <span>Conditional Pass</span>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="text-sm text-gray-600 mb-4">Executive Summary</div>
          <p className="text-sm text-gray-700 leading-relaxed">
            The tender is technically viable for your organization based on current machinery and past experience credentials. However, there are significant <strong>financial documentation risks</strong> regarding the solvency certificate format. The legal framework contains one unusual arbitration clause that requires review. Submission deadlines are tight with physical submission requirements.
          </p>
        </div>
      </div>

      {/* Risk Breakdown */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">Risk Breakdown</h3>
        <div className="grid grid-cols-4 gap-4">
          <RiskCard
            category="FINANCIAL"
            count={2}
            label="Critical"
            description="Solvency & EMD formats"
            color="red"
          />
          <RiskCard
            category="TECHNICAL"
            count={0}
            label="Critical"
            description="Experience meets criteria"
            color="green"
          />
          <RiskCard
            category="LEGAL"
            count={1}
            label="Warning"
            description="Arbitration clause check"
            color="orange"
          />
          <RiskCard
            category="SUBMISSION"
            count={3}
            label="Traps"
            description="Formatting & Physical copies"
            color="red"
          />
        </div>
      </div>

      {/* Identified Risks Registry */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">⚠️ Identified Risks Registry</h3>
          <div className="text-sm text-gray-600">Sort by: Severity</div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-gray-200">
                <th className="pb-3 font-medium text-gray-600">SEVERITY</th>
                <th className="pb-3 font-medium text-gray-600">RISK DESCRIPTION</th>
                <th className="pb-3 font-medium text-gray-600">REFERENCE</th>
              </tr>
            </thead>
            <tbody>
              <RiskRow
                severity="High"
                description="Non-standard Bid Capacity Formula"
                detail="The calculation methodology for 'A' (Maximum Value of Works) uses a 5-year average instead of the standard PWD 'Max in 5 years'."
                reference="Cl. 4.2, Pg 12"
                severityColor="red"
              />
              <RiskRow
                severity="High"
                description="Machinery Ownership Requirement"
                detail="Clause implies strict ownership of Paver Finisher. Lease arrangement not explicitly allowed under this tender framework."
                reference="Cl. 18.a, Pg 45"
                severityColor="red"
              />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface RiskCardProps {
  category: string;
  count: number;
  label: string;
  description: string;
  color: 'red' | 'green' | 'orange';
}

function RiskCard({ category, count, label, description, color }: RiskCardProps) {
  const colors = {
    red: 'bg-red-50 border-red-200 text-red-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    orange: 'bg-orange-50 border-orange-200 text-orange-700',
  };

  const icons = {
    red: '🔴',
    green: '🟢',
    orange: '🟠',
  };

  return (
    <div className={`border rounded-lg p-4 ${colors[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        <span>{icons[color]}</span>
        <div className="text-xs font-semibold uppercase">{category}</div>
      </div>
      <div className="text-2xl font-bold mb-1">{count}</div>
      <div className="text-xs font-medium mb-1">{label}</div>
      <div className="text-xs opacity-90">{description}</div>
    </div>
  );
}

interface RiskRowProps {
  severity: string;
  description: string;
  detail: string;
  reference: string;
  severityColor: 'red' | 'orange' | 'yellow';
}

function RiskRow({ severity, description, detail, reference, severityColor }: RiskRowProps) {
  const colors = {
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    yellow: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <tr className="border-b border-gray-100">
      <td className="py-4">
        <span className={`px-2 py-1 rounded text-xs font-medium ${colors[severityColor]}`}>
          {severity}
        </span>
      </td>
      <td className="py-4">
        <div className="font-medium text-gray-900 mb-1">{description}</div>
        <div className="text-xs text-gray-600">{detail}</div>
      </td>
      <td className="py-4 text-gray-700">{reference}</td>
    </tr>
  );
}
