'use client';

/**
 * The tender register (every analysed tender, newest first) and the upload that adds to it.
 */

import { Suspense, useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/state/authStore';
import TenderUpload from '@/components/dashboard/TenderUpload';
import SiteOffice from '@/components/site-office/SiteOffice';
import { ANALYSIS_JOB, useJobsStore } from '@/state/jobsStore';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { fetchRegister } from '@/lib/data/api';
import type { StoredReport } from '@/lib/tenders/pipeline';
import { RISK_TEXT } from '@/components/analysis/risk';
import type { RiskLevel } from '@/features/compliance-scoring/types/compliance.types';
import { countdown, daysUntil, formatKeyDate } from '@/features/summarization/services/dates';
import { urgency } from '@/components/analysis/KeyDates';

const bidDue = (report: StoredReport) => report.summary?.metadata?.keyDates?.find(d => d.kind === 'submission');
const isOpen = (report: StoredReport) => {
  const due = bidDue(report);
  return !!due && daysUntil(due.date) >= 0;
};

/** Bids still open come first, soonest deadline on top; the rest follow, newest upload first. */
function registerOrder(a: StoredReport, b: StoredReport): number {
  const [openA, openB] = [isOpen(a), isOpen(b)];
  if (openA !== openB) return openA ? -1 : 1;
  if (openA) return bidDue(a)!.date.localeCompare(bidDue(b)!.date) || (bidDue(a)!.time ?? '').localeCompare(bidDue(b)!.time ?? '');
  return b.uploadedAt.localeCompare(a.uploadedAt);
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const deniedPath = searchParams.get('denied');
  const { can } = useAuthStore();
  const [reports, setReports] = useState<StoredReport[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  // The run lives in the jobs store so it keeps going if the user opens another page.
  const job = useJobsStore(state => state.jobs[ANALYSIS_JOB]);
  const startAnalysis = useJobsStore(state => state.startAnalysis);
  const clearJob = useJobsStore(state => state.clearJob);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    fetchRegister().then(
      ({ reports }) => {
        setReports(reports.sort(registerOrder));
        setIsLoadingData(false);
      },
      (err: Error) => {
        setLoadError(err.message);
        setIsLoadingData(false);
      }
    );
  }, []);

  // Watched it finish here: open the report, as before. Finished while away: the toast already offered it.
  const watchedRun = useRef(false);
  useEffect(() => {
    if (job?.status === 'running') watchedRun.current = true;
    if (job?.status !== 'done') return;
    clearJob(ANALYSIS_JOB);
    if (watchedRun.current) router.push(job.href);
  }, [job, clearJob, router]);

  const handleRetryUpload = () => clearJob(ANALYSIS_JOB);

  const countAt = (level: RiskLevel) => reports.filter(r => r.compliance?.riskLevel === level).length;
  const highRisk = countAt('High');
  const dueThisWeek = reports.filter(r => isOpen(r) && daysUntil(bidDue(r)!.date) <= 7).length;
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
                }${dueThisWeek ? ` ${dueThisWeek} ${dueThisWeek === 1 ? 'bid is' : 'bids are'} due within a week.` : ''}`}
        </h1>
      </div>

      {loadError && (
        <p role="alert" className="border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
          {loadError}
        </p>
      )}

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
        {can('tender.upload') && !job && <TenderUpload onUpload={startAnalysis} />}
        {job && (job.status === 'running' || (job.status === 'error' && job.events.length > 0)) && (
          <SiteOffice
            pipeline="analysis"
            events={job.events}
            title={`Reading ${job.title}`}
            error={job.status === 'error' ? job.error : null}
          />
        )}
        {job?.status === 'done' && (
          <p className="border border-rule-strong bg-sheet p-8 text-center text-ink">
            Analysis complete. Opening the report…
          </p>
        )}
        {job?.status === 'error' && (
          <div className="border border-seal/40 bg-seal-tint p-8 flex flex-col items-center gap-3 text-center">
            <p className="font-serif text-xl text-seal">The tender couldn&apos;t be analysed</p>
            {/* With events the site office above already shows the message. */}
            {job.events.length === 0 && <p className="text-sm text-ink-soft">{job.error || 'Please try again.'}</p>}
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
  const title = report.summary?.metadata?.nameOfWork || report.summary?.metadata?.tenderTitle || report.fileName;
  const due = bidDue(report);
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
      <div className="flex flex-[1_1_150px] flex-col text-sm tabular-nums">
        {due ? (
          <>
            <span className="text-ink-soft">Bid due {formatKeyDate(due)}</span>
            <span className={`font-medium ${urgency(due.date)}`}>{daysUntil(due.date) < 0 ? 'Closed' : countdown(due.date)}</span>
          </>
        ) : (
          <span className="text-muted">Bid due date not found</span>
        )}
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
