'use client';

/**
 * Phase 5B: Analysis Tabs Component
 * Tab navigation for analysis view
 * Enhanced with keyboard navigation and accessibility
 */

import { ReactNode, KeyboardEvent } from 'react';

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
  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, tabId: string) => {
    const currentIndex = TABS.findIndex(t => t.id === activeTab);
    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        nextIndex = currentIndex > 0 ? currentIndex - 1 : TABS.length - 1;
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextIndex = currentIndex < TABS.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        e.preventDefault();
        nextIndex = 0;
        break;
      case 'End':
        e.preventDefault();
        nextIndex = TABS.length - 1;
        break;
      default:
        return;
    }

    onTabChange(TABS[nextIndex].id);
  };

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="flex items-center gap-1 px-6" role="tablist" aria-label="Analysis sections">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            id={`tab-${tab.id}`}
            tabIndex={activeTab === tab.id ? 0 : -1}
            className={`
              px-4 py-3 text-sm font-medium border-b-2 transition-colors
              focus:outline-none focus:ring-2 focus:ring-amber-900 focus:ring-offset-2 rounded-t
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
                aria-label={`${tab.badge} items`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`}>
        {children}
      </div>
    </div>
  );
}
