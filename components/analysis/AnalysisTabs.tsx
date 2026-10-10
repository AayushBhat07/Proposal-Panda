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
  { id: 'compliance', label: 'Compliance' },
  { id: 'clauses', label: 'Clauses & Legal' },
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
    <div>
      <div className="flex flex-wrap gap-x-7 border-b border-rule" role="tablist" aria-label="Analysis sections">
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
              -mb-px min-h-11 border-b-2 text-[15px] transition-colors
              ${
                activeTab === tab.id
                  ? 'border-ink font-medium text-ink'
                  : 'border-transparent text-muted hover:text-ink'
              }
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${activeTab}`} aria-labelledby={`tab-${activeTab}`} className="pt-8">
        {children}
      </div>
    </div>
  );
}
