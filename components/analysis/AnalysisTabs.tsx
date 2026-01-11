'use client';

/**
 * Phase 5A: Analysis Tabs Component
 * Tab navigation for analysis view
 */

import { ReactNode } from 'react';

interface AnalysisTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  children: ReactNode;
}

const TABS = [
  { id: 'summary', label: 'Summary' },
  { id: 'compliance', label: 'Compliance', badge: 4 },
  { id: 'clauses', label: 'Clauses & Legal', badge: 12 },
  { id: 'boq', label: 'BOQ Insights' },
  { id: 'metadata', label: 'Metadata' },
];

export default function AnalysisTabs({ activeTab, onTabChange, children }: AnalysisTabsProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 px-6">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 transition-colors
              ${
                activeTab === tab.id
                  ? 'border-amber-900 text-amber-900'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }
            `}
          >
            {tab.label}
            {tab.badge && (
              <span
                className={`ml-2 px-2 py-0.5 rounded text-xs ${
                  activeTab === tab.id ? 'bg-amber-100 text-amber-900' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div>{children}</div>
    </div>
  );
}
