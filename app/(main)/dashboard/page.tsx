'use client';

/**
 * Dashboard: the tender register (every analysed tender, newest first) and the upload that adds to it.
 */

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/state/authStore';
import TenderUpload from '@/components/dashboard/TenderUpload';
import ProcessingState from '@/components/dashboard/ProcessingState';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { saveToLocalStorage, getFromLocalStorage } from '@/services/storage/mockStorageService';
import { RISK_TEXT } from '@/components/analysis/risk';
import type { RiskLevel } from '@/features/compliance-scoring/types/compliance.types';

type UploadState = 'idle' | 'processing' | 'success' | 'error';
type ProcessingStage = 'analyzing' | 'scoring' | 'finalizing';

interface StoredReport {
  id: string;
  fileName: string;
  uploadedAt: string;
  summary?: { metadata?: { tenderTitle?: string; nitReference?: string } };
  compliance?: { riskLevel?: RiskLevel; complianceScore?: number };
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deniedPath = searchParams.get('denied');
  const { can } = useAuthStore();
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('analyzing');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const stored = getFromLocalStorage<StoredReport[]>('intelligenceReports');
    const list = Array.isArray(stored) ? stored : [];
    setReports(list.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt)));
    setIsLoadingData(false);
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      setUploadedFile(file);
      setUploadState('processing');
      setProcessingStage('analyzing');
      setErrorMessage(null);

      const tenderId = `TENDER-${Date.now()}`;
      const tenderTitle = file.name.replace(/\.(pdf|docx)$/i, '');

      // Run the analysis pipeline (text extraction → local-model summary → compliance scoring)
      const formData = new FormData();
      formData.append('file', file);
      formData.append('tenderId', tenderId);
      formData.append('tenderTitle', tenderTitle);

      // The stage indicator can't see inside the pipeline, so advance it on a timer.
      const scoringTimer = setTimeout(() => setProcessingStage('scoring'), 4000);
      const response = await fetch('/api/intelligence/run', { method: 'POST', body: formData });
      clearTimeout(scoringTimer);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || 'Failed to process tender document.');
      }
      setProcessingStage('finalizing');

      const saved = saveToLocalStorage('intelligenceReports', {
        id: tenderId,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        ...data,
      });
      if (!saved) {
        throw new Error(
          'The analysis finished but could not be saved in this browser. Browser storage may be full or blocked; free some space and try again.'
        );
      }
      localStorage.setItem('tender-app-latestTenderId', tenderId);

      setUploadState('success');
      router.push(`/tenders/${tenderId}/analysis`);
    } catch (error) {
      console.error('Processing error:', error);
      setUploadState('error');
      setErrorMessage(
        error instanceof Error ? error.message : 'Failed to process tender document. Please try again.'
      );
    }
  };

  const handleRetryUpload = () => {
    setUploadState('idle');
    setUploadedFile(null);
    setErrorMessage(null);
  };

  const countAt = (level: RiskLevel) => reports.filter(r => r.compliance?.riskLevel === level).length;
  const highRisk = countAt('High');
  const month = new Date().toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }).toUpperCase();

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-14 pt-10 pb-16 flex flex-col gap-9">
      <div className="flex flex-col gap-2 max-w-3xl">
        <span className="font-mono text-xs tracking-widest text-muted">TENDER REGISTER · {month}</span>
        <h1 className="font-serif text-4xl leading-tight text-ink">
          {isLoadingData
            ? 'Loading the register…'
            : reports.length === 0
              ? 'The register is empty. Upload a tender to begin.'
              : `${reports.length} ${reports.length === 1 ? 'tender' : 'tenders'} on the register${
                  highRisk ? `, ${highRisk} at high risk.` : '.'
                }`}
        </h1>
      </div>

      {deniedPath && (
        <p role="alert" className="border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
          Your role can&apos;t open {deniedPath}.
        </p>
      )}

      {reports.length > 0 && (
        <dl className="grid grid-cols-2 sm:grid-cols-4 border-t border-ink border-b border-b-rule">
          <Stat label="Analysed" value={reports.length} />
          <Stat label="Low risk" value={countAt('Low')} />
          <Stat label="Medium risk" value={countAt('Medium')} />
          <Stat label="High risk" value={highRisk} tone={highRisk ? 'text-seal' : undefined} />
        </dl>
      )}

      <section aria-labelledby="upload-heading" className="flex flex-col gap-4">
        <h2 id="upload-heading" className="font-mono text-xs tracking-widest text-muted">
          ADD A TENDER
        </h2>
        {!can('tender.upload') && (
          <p className="text-sm text-ink-soft">Your role can read analysed tenders but not upload new ones.</p>
        )}
        {can('tender.upload') && uploadState === 'idle' && <TenderUpload onUpload={handleFileUpload} />}
        {uploadState === 'processing' && uploadedFile && (
          <ProcessingState fileName={uploadedFile.name} stage={processingStage} />
        )}
        {uploadState === 'success' && (
          <p className="border border-rule-strong bg-sheet p-8 text-center text-ink">
            Analysis complete. Opening the report…
          </p>
        )}
        {uploadState === 'error' && (
          <div className="border border-seal/40 bg-seal-tint p-8 flex flex-col items-center gap-3 text-center">
            <p className="font-serif text-xl text-seal">The tender couldn&apos;t be analysed</p>
            <p className="text-sm text-ink-soft">{errorMessage || 'Please try again.'}</p>
            <Button onClick={handleRetryUpload}>Try again</Button>
          </div>
        )}
      </section>

      <section aria-labelledby="register-heading" className="flex flex-col">
        <h2 id="register-heading" className="sr-only">
          Analysed tenders
        </h2>
        {isLoadingData ? (
          <Spinner size="md" className="text-forest" />
        ) : (
          reports.map(report => <RegisterRow key={report.id} report={report} />)
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="py-4 flex flex-col gap-1">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`font-serif text-3xl ${tone ?? 'text-ink'}`}>{value}</dd>
    </div>
  );
}

function RegisterRow({ report }: { report: StoredReport }) {
  const uploaded = new Date(report.uploadedAt);
  const title = report.summary?.metadata?.tenderTitle || report.fileName;
  const reference = report.summary?.metadata?.nitReference || report.id;
  const risk = report.compliance?.riskLevel;
  const score = report.compliance?.complianceScore;

  return (
    <article className="flex flex-wrap items-baseline gap-x-7 gap-y-3 border-b border-rule py-6">
      <div className="flex w-16 flex-none flex-col">
        <span className="font-serif text-3xl leading-none">{uploaded.toLocaleDateString('en-IN', { day: '2-digit' })}</span>
        <span className="mt-1 font-mono text-xs text-muted">
          {uploaded.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase()}
        </span>
      </div>
      <div className="flex min-w-0 flex-[999_1_380px] flex-col gap-1.5">
        <Link
          href={`/tenders/${report.id}/analysis`}
          className="font-serif text-xl leading-snug text-ink hover:text-forest"
        >
          {title}
        </Link>
        <span className="font-mono text-xs text-muted break-all">
          {reference} · {report.fileName}
        </span>
      </div>
      <div className="flex-[1_1_120px] text-sm text-ink-soft tabular-nums">
        {score !== undefined ? `${score} / 100 compliance` : 'Not scored'}
      </div>
      <div className={`flex-[1_1_120px] text-sm font-medium ${risk ? RISK_TEXT[risk] : 'text-muted'}`}>
        {risk ? `${risk} risk` : 'Risk unknown'}
      </div>
    </article>
  );
}
