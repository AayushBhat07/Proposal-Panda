'use client';

/**
 * Phase 5B: Tender Analysis Page
 * Main analysis view with tabs
 * Enhanced with loading and error states
 */

import { useState, useEffect } from 'react';
import AnalysisTabs from '@/components/analysis/AnalysisTabs';
import SummaryPanel from '@/components/analysis/SummaryPanel';
import CompliancePanel from '@/components/analysis/CompliancePanel';
import ClausesPanel from '@/components/analysis/ClausesPanel';
import BOQInsightsPanel from '@/components/analysis/BOQInsightsPanel';
import MetadataPanel from '@/components/analysis/MetadataPanel';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

// TODO: Replace with actual Phase 4C API call
import { MOCK_INTELLIGENCE_REPORT } from '@/lib/mock/mockIntelligenceReport';

export default function TenderAnalysisPage({ params }: { params: { id: string } }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // TODO: Fetch real data using params.id
  const report = MOCK_INTELLIGENCE_REPORT;

  // Simulate loading analysis data
  useEffect(() => {
    const loadAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        setIsLoading(false);
      } catch (err) {
        setError('Failed to load analysis data. Please try again.');
        setIsLoading(false);
      }
    };
    loadAnalysis();
  }, [params.id]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setTimeout(() => setIsLoading(false), 1000);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div className="animate-pulse">
              <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
              <div className="h-6 bg-gray-200 rounded w-96 mb-1"></div>
              <div className="h-4 bg-gray-200 rounded w-64"></div>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Spinner size="lg" className="text-amber-900 mb-4" />
            <p className="text-gray-600">Loading analysis...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-gray-200 p-6">
          <h1 className="text-xl font-semibold text-gray-900">Analysis Error</h1>
        </div>
        <div className="flex-1 flex items-center justify-center bg-gray-50">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">⚠️</span>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Unable to Load Analysis</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={handleRetry} className="bg-amber-900 text-white hover:bg-amber-800">
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-gray-900">{params.id}</span>
              <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded">
                Moderate Risk
              </span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              Compliance Analysis: State Highway 14 Reconstruction
            </h1>
            <p className="text-sm text-gray-600">
              Reconstruction of State Highway 14 (Nagpur District) | Last updated: 2 hours ago
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-gray-300 text-gray-700">
              🔗 Share
            </Button>
            <Button variant="outline" className="border-gray-300 text-gray-700">
              📥 Download PDF Report
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs and Content */}
      <AnalysisTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'summary' && <SummaryPanel summary={report.summary} />}
        {activeTab === 'compliance' && <CompliancePanel compliance={report.compliance} />}
        {activeTab === 'clauses' && <ClausesPanel />}
        {activeTab === 'boq' && <BOQInsightsPanel />}
        {activeTab === 'metadata' && <MetadataPanel metadata={report.metadata} />}
      </AnalysisTabs>
    </div>
  );
}
