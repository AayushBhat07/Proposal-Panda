'use client';

/**
 * Foundation bid for an analysed tender: generate it with the local model, read it, download it.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Download, Lock } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/state/authStore';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { getFromLocalStorage, saveToLocalStorage } from '@/services/storage/mockStorageService';
import type { BidCover, FoundationBid } from '@/features/bid-generation';

const COVERS: Array<{ cover: BidCover; label: string; title: string; note?: string }> = [
  { cover: 'technical', label: 'COVER I', title: 'Technical bid' },
  {
    cover: 'financial',
    label: 'COVER II',
    title: 'Financial bid',
    note: 'Opened only for bidders who pass Cover I. Prices are never generated: fill the proforma yourself.',
  },
];

type StoredBid = FoundationBid & { id: string };

export default function FoundationBidPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { can } = useAuthStore();
  const { companyProfile } = useOnboarding();
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [bid, setBid] = useState<StoredBid | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setReport(getFromLocalStorage<Record<string, unknown>>('intelligenceReports', id));
    setBid(getFromLocalStorage<StoredBid>('foundationBids', id));
    setIsLoaded(true);
  }, [id]);

  const handleGenerate = async () => {
    if (!report) return;
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch('/api/bid/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report, companyProfile }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.details || data.error || 'Bid generation failed.');
      const stored: StoredBid = { ...data, id };
      saveToLocalStorage('foundationBids', stored);
      setBid(stored);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Bid generation failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!bid) return;
    const markdown = [
      `# Bid: ${bid.tenderTitle} (${bid.tenderId})`,
      ...COVERS.flatMap(({ cover, label, title }) => [
        `# ${label}: ${title}`,
        ...bid.sections.filter(s => s.cover === cover).map(s => `## ${s.title}\n\n${s.content}`),
      ]),
    ].join('\n\n');
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bid.tenderId}-foundation-bid.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (!isLoaded) {
    return (
      <div className="py-24">
        <Spinner size="lg" className="text-forest" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center flex flex-col items-center gap-4">
        <p className="font-serif text-2xl text-ink">This tender hasn&apos;t been analysed in this browser yet.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back to the register
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-8 lg:px-14 pt-8 pb-16 flex flex-col gap-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/tenders/${id}/analysis`}
          className="inline-flex min-h-11 items-center text-sm text-ink-soft hover:text-ink"
        >
          ← Analysis
        </Link>
        <div className="flex flex-wrap gap-3">
          {bid && (
            <Button variant="outline" onClick={handleDownload}>
              <Download className="h-4 w-4" aria-hidden />
              Download (.md)
            </Button>
          )}
          {can('bid.generate') && (
            <Button onClick={handleGenerate} isLoading={isGenerating} disabled={isGenerating || !companyProfile}>
              {bid ? 'Redraft the bid' : 'Draft the foundation bid'}
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-muted">BID FILE · TWO-COVER SYSTEM</span>
        <h1 className="font-serif text-4xl leading-tight text-ink max-w-4xl">{bid?.tenderTitle ?? id}</h1>
        {bid && (
          <p className="text-sm text-muted">
            Drafted by {bid.modelUsed} on {new Date(bid.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}. Review every section
            before submitting.
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
          {error}
        </p>
      )}

      {isGenerating && (
        <p role="status" className="border-l-2 border-ochre bg-ochre-tint px-4 py-3 text-sm text-ink">
          Drafting each section on the local model. This can take several minutes on CPU.
        </p>
      )}

      {!bid && !isGenerating && (
        <p className="border border-rule-strong bg-sheet p-10 text-center font-serif text-xl text-ink-soft">
          {can('bid.generate')
            ? 'No bid yet. Draft one from this analysis and your company profile.'
            : 'No bid has been drafted for this tender yet. Ask a Bid Writer or Admin to draft one.'}
        </p>
      )}

      {bid && (
        <>
          <div className="grid gap-7 [grid-template-columns:repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start">
            {COVERS.map(({ cover, label, title, note }) => {
              const sections = bid.sections.filter(section => section.cover === cover);
              return (
                <section key={cover} aria-labelledby={`cover-${cover}`} className="border border-rule-strong bg-sheet">
                  <div className="flex items-baseline justify-between gap-3 border-b border-rule px-6 pt-5 pb-3.5">
                    <div className="flex flex-col gap-1">
                      <span className="font-mono text-xs tracking-widest text-muted">{label}</span>
                      <h2 id={`cover-${cover}`} className="font-serif text-2xl text-ink">
                        {title}
                      </h2>
                    </div>
                    <span className="text-sm text-ink-soft">
                      {sections.length} {sections.length === 1 ? 'section' : 'sections'}
                    </span>
                  </div>
                  {cover === 'financial' && (
                    <div className="flex items-center gap-4 px-6 pt-5">
                      <div className="flex h-12 w-12 flex-none items-center justify-center rounded-full bg-seal text-paper" aria-hidden>
                        <Lock className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <p className="text-sm leading-relaxed text-ink-soft">{note}</p>
                    </div>
                  )}
                  <ol className="px-6 pt-2 pb-4">
                    {sections.map((section, index) => (
                      <li key={section.id} className="flex items-baseline gap-3.5 border-b border-dotted border-rule-strong py-2.5">
                        <span className="w-6 font-mono text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
                        <a href={`#${section.id}`} className="flex-1 text-[15px] text-ink hover:text-forest">
                          {section.title}
                        </a>
                        <span className={`text-xs font-medium ${section.source === 'model' ? 'text-forest' : 'text-muted'}`}>
                          {section.source === 'model' ? 'Drafted' : 'Proforma'}
                        </span>
                      </li>
                    ))}
                  </ol>
                </section>
              );
            })}
          </div>

          {COVERS.map(({ cover, title }) => (
            <div key={cover} className="flex flex-col gap-5">
              <h2 className="border-b border-ink pb-2 font-serif text-2xl text-ink">{title}</h2>
              {bid.sections
                .filter(section => section.cover === cover)
                .map(section => (
                  <section key={section.id} id={section.id} className="scroll-mt-6 border border-rule bg-sheet p-6">
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="font-serif text-xl font-semibold text-ink">{section.title}</h3>
                      <span className="font-mono text-xs text-muted">
                        {section.source === 'model' ? `Drafted by ${bid.modelUsed}` : 'Standard proforma'}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{section.content}</div>
                  </section>
                ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
