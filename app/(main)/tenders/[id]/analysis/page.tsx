'use client';

/**
 * Phase 5B: Tender Analysis Page
 * Main analysis view with tabs
 * Enhanced with loading, error states, and localStorage persistence
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AnalysisTabs from '@/components/analysis/AnalysisTabs';
import SummaryPanel from '@/components/analysis/SummaryPanel';
import CompliancePanel from '@/components/analysis/CompliancePanel';
import ClausesPanel from '@/components/analysis/ClausesPanel';
import BOQInsightsPanel from '@/components/analysis/BOQInsightsPanel';
import MetadataPanel from '@/components/analysis/MetadataPanel';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { getFromLocalStorage } from '@/services/storage/mockStorageService';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';

export default function TenderAnalysisPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  
  // Load analysis data from localStorage
  useEffect(() => {
    const loadAnalysis = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Try to load from localStorage
        const storedReport = getFromLocalStorage<any>('intelligenceReports', params.id);
        
        if (!storedReport) {
          setError('Analysis not found. This tender may have been deleted or never processed.');
          setIsLoading(false);
          return;
        }
        
        // Extract the report structure (remove id, fileName, uploadedAt)
        const { id, fileName, uploadedAt, ...reportData } = storedReport;
        setReport(reportData as IntelligenceReport);
        setIsLoading(false);
      } catch (err) {
        console.error('Error loading analysis:', err);
        setError('Failed to load analysis data. Please try again.');
        setIsLoading(false);
      }
    };
    
    loadAnalysis();
  }, [params.id]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    
    setTimeout(() => {
      const storedReport = getFromLocalStorage<any>('intelligenceReports', params.id);
      if (storedReport) {
        const { id, fileName, uploadedAt, ...reportData } = storedReport;
        setReport(reportData as IntelligenceReport);
        setError(null);
      } else {
        setError('Analysis not found. This tender may have been deleted or never processed.');
      }
      setIsLoading(false);
    }, 500);
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
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
            <div className="flex gap-3 justify-center">
              <Button 
                onClick={handleBackToDashboard} 
                variant="outline"
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Back to Dashboard
              </Button>
              <Button 
                onClick={handleRetry} 
                className="bg-amber-900 text-white hover:bg-amber-800"
              >
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // No report loaded
  if (!report) {
    return null;
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl font-bold text-gray-900">{params.id}</span>
              <span className={`px-2 py-1 text-xs font-medium rounded ${
                report.compliance.riskLevel === 'Low' ? 'bg-green-100 text-green-700' :
                report.compliance.riskLevel === 'Medium' ? 'bg-orange-100 text-orange-700' :
                'bg-red-100 text-red-700'
              }`}>
                {report.compliance.riskLevel} Risk
              </span>
            </div>
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {report.summary.metadata.tenderTitle}
            </h1>
            <p className="text-sm text-gray-600">
              Compliance Analysis | Last updated: {new Date(report.metadata.generatedAt).toLocaleString()}
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
