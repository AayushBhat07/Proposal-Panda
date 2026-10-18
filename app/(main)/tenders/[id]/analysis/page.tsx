'use client';

/**
 * Tender analysis: summary, compliance, clauses, BOQ and metadata tabs for one tender on the office register.
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/state/authStore';
import AnalysisTabs from '@/components/analysis/AnalysisTabs';
import SummaryPanel from '@/components/analysis/SummaryPanel';
import CompliancePanel from '@/components/analysis/CompliancePanel';
import ClausesPanel from '@/components/analysis/ClausesPanel';
import BOQInsightsPanel from '@/components/analysis/BOQInsightsPanel';
import MetadataPanel from '@/components/analysis/MetadataPanel';
import { RISK_CHIP } from '@/components/analysis/risk';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { fetchTender, saveKeyDates } from '@/lib/data/api';
import KeyDates from '@/components/analysis/KeyDates';
import type { KeyDate } from '@/features/summarization/services/dates';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';

export default function TenderAnalysisPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuthStore();
  const [activeTab, setActiveTab] = useState('summary');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<IntelligenceReport | null>(null);
  const [hasFile, setHasFile] = useState(false);
  
  const load = useCallback(
    () =>
      fetchTender<IntelligenceReport, unknown>(params.id).then(
        ({ report, hasFile }) => {
          setReport(report);
          setHasFile(hasFile);
          setError(null);
          setIsLoading(false);
        },
        (err: Error) => {
          setError(
            err.message === 'No such tender.'
              ? 'Analysis not found. This tender may have been deleted or never processed.'
              : err.message
          );
          setIsLoading(false);
        }
      ),
    [params.id]
  );

  useEffect(() => {
    load();
  }, [load]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    load();
  };

  // Corrigenda move dates; the corrected dates replace the ones read from the NIT for everyone.
  const handleSaveDates = (keyDates: KeyDate[]) => {
    if (!report) return;
    const summary = { ...report.summary, metadata: { ...report.summary.metadata, keyDates } };
    setReport({ ...report, summary });
    saveKeyDates(params.id, keyDates).catch((err: Error) => setError(err.message));
  };

  const handleBackToDashboard = () => {
    router.push('/register');
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="py-24">
        <Spinner size="lg" className="text-forest" />
        <p className="mt-4 text-center text-muted">Loading analysis…</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center flex flex-col items-center gap-4">
        <h1 className="font-serif text-3xl text-ink">This analysis couldn&apos;t be opened</h1>
        <p className="text-ink-soft">{error}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={handleBackToDashboard}>
            Back to the register
          </Button>
          <Button onClick={handleRetry}>Try again</Button>
        </div>
      </div>
    );
  }

  // No report loaded
  if (!report) {
    return null;
  }

  const { metadata } = report.summary;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-14 pt-8 pb-16 flex flex-col gap-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/register" className="inline-flex min-h-11 items-center text-sm text-ink-soft hover:text-ink">
          ← Register
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          {hasFile && (
            <a
              href={`/api/tenders/${encodeURIComponent(params.id)}/file`}
              target="_blank"
              rel="noopener"
              className="inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-4 hover:text-ink"
            >
              Open the NIT
            </a>
          )}
          {can('bid.view') && (
            <Button onClick={() => router.push(`/tenders/${params.id}/bid`)}>Prepare the bid</Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-muted break-all">
          {(metadata.nitReference || params.id).toUpperCase()}
        </span>
        <h1 className="font-serif text-4xl leading-tight text-balance text-ink max-w-4xl">{metadata.nameOfWork ?? metadata.tenderTitle}</h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-ink-soft">
          <span className={`px-2.5 py-1 text-xs font-medium ${RISK_CHIP[report.compliance.riskLevel]}`}>
            {report.compliance.riskLevel} risk · {report.compliance.complianceScore} / 100
          </span>
          {metadata.completionMonths && <span>{metadata.completionMonths} months to complete</span>}
          <span>Analysed {new Date(report.metadata.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</span>
        </div>
      </div>

      <KeyDates key={JSON.stringify(metadata.keyDates ?? null)} dates={metadata.keyDates} onPortal={metadata.datesOnPortal} editable={can('tender.upload')} onSave={handleSaveDates} />

      <AnalysisTabs activeTab={activeTab} onTabChange={setActiveTab}>
        {activeTab === 'summary' && <SummaryPanel summary={report.summary} />}
        {activeTab === 'compliance' && <CompliancePanel compliance={report.compliance} />}
        {activeTab === 'clauses' && <ClausesPanel metadata={metadata} />}
        {activeTab === 'boq' && <BOQInsightsPanel metadata={metadata} />}
        {activeTab === 'metadata' && <MetadataPanel metadata={report.metadata} />}
      </AnalysisTabs>
    </div>
  );
}
