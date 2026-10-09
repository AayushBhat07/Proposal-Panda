'use client';

/**
 * Foundation bid for an analysed tender: generate it with the local model, edit it, fill its blanks,
 * and download each cover as a Word file.
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Download, Lock, Pencil } from 'lucide-react';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/state/authStore';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { getFromLocalStorage, saveToLocalStorage } from '@/services/storage/mockStorageService';
import type { BidCover, FoundationBid } from '@/features/bid-generation';
import { countBlanks, splitBlanks, unwrapLines } from '@/features/bid-generation/services/draftText';
import { coverToBlob } from '@/features/bid-generation/services/bidDocx';

const COVERS: Array<{ cover: BidCover; label: string; title: string; file: string; note?: string }> = [
  { cover: 'technical', label: 'COVER I', title: 'Technical bid', file: 'cover-1-technical' },
  {
    cover: 'financial',
    label: 'COVER II',
    title: 'Financial bid',
    file: 'cover-2-financial',
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
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const blankCursor = useRef(-1);

  useEffect(() => {
    setReport(getFromLocalStorage<Record<string, unknown>>('intelligenceReports', id));
    setBid(getFromLocalStorage<StoredBid>('foundationBids', id));
    setIsLoaded(true);
  }, [id]);

  const handleGenerate = async () => {
    if (!report) return;
    if (bid?.sections.some(s => s.editedAt) && !window.confirm('Redrafting replaces the sections you edited. Continue?')) {
      return;
    }
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

  const handleDownload = async (cover: BidCover, file: string) => {
    if (!bid) return;
    const metadata = (report?.summary as { metadata?: { nitReference?: string } } | undefined)?.metadata;
    const blob = await coverToBlob(bid, cover, metadata?.nitReference ?? '[NIT No.]', companyProfile?.legalName ?? '[Company]');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bid.tenderId}-${file}.docx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveEdit = () => {
    if (!bid || !editing) return;
    const editedAt = new Date().toISOString();
    const updated: StoredBid = {
      ...bid,
      sections: bid.sections.map(s => (s.id === editing.id ? { ...s, content: editing.text, editedAt } : s)),
    };
    saveToLocalStorage('foundationBids', updated);
    setBid(updated);
    setEditing(null);
  };

  // Cycles through the highlighted blanks in reading order.
  const handleNextBlank = () => {
    const blanks = document.querySelectorAll<HTMLElement>('mark[data-blank]');
    if (blanks.length === 0) return;
    blankCursor.current = (blankCursor.current + 1) % blanks.length;
    const target = blanks[blankCursor.current];
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.focus({ preventScroll: true });
  };

  const totalBlanks = bid ? bid.sections.reduce((sum, s) => sum + countBlanks(s.content), 0) : 0;

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
          {bid &&
            COVERS.map(({ cover, title, file }) => (
              <Button key={cover} variant="outline" onClick={() => handleDownload(cover, file)}>
                <Download className="h-4 w-4" aria-hidden />
                {title} (.docx)
              </Button>
            ))}
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

      {bid && (
        <div
          role="status"
          className={`flex flex-wrap items-center justify-between gap-3 border-l-2 px-4 py-3 ${
            totalBlanks ? 'border-ochre bg-ochre-tint' : 'border-forest bg-forest-tint'
          }`}
        >
          <p className="text-sm text-ink">
            {totalBlanks
              ? `${totalBlanks} ${totalBlanks === 1 ? 'blank' : 'blanks'} left to fill, highlighted below. Fill them here or in Word.`
              : 'No blanks left. Read it through once more, then download both covers.'}
          </p>
          {totalBlanks > 0 && (
            <Button variant="outline" size="sm" onClick={handleNextBlank}>
              Next blank
            </Button>
          )}
        </div>
      )}

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
                    {sections.map((section, index) => {
                      const blanks = countBlanks(section.content);
                      return (
                        <li key={section.id} className="flex items-baseline gap-3.5 border-b border-dotted border-rule-strong py-2.5">
                          <span className="w-6 font-mono text-xs text-muted">{String(index + 1).padStart(2, '0')}</span>
                          <a href={`#${section.id}`} className="flex-1 text-[15px] text-ink hover:text-forest">
                            {section.title}
                          </a>
                          <span className={`text-xs font-medium ${blanks ? 'text-ochre' : 'text-forest'}`}>
                            {blanks ? `${blanks} ${blanks === 1 ? 'blank' : 'blanks'}` : 'Complete'}
                          </span>
                        </li>
                      );
                    })}
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
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-serif text-xl font-semibold text-ink">{section.title}</h3>
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted">
                          {section.editedAt
                            ? 'Edited'
                            : section.source === 'model'
                              ? `Drafted by ${bid.modelUsed}`
                              : 'Standard proforma'}
                        </span>
                        {can('bid.generate') && editing?.id !== section.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing({ id: section.id, text: section.content })}
                            aria-label={`Edit ${section.title}`}
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden />
                            Edit
                          </Button>
                        )}
                      </div>
                    </div>
                    {editing?.id === section.id ? (
                      <div className="flex flex-col gap-3">
                        <label htmlFor={`edit-${section.id}`} className="sr-only">
                          {section.title}
                        </label>
                        <textarea
                          id={`edit-${section.id}`}
                          value={editing.text}
                          onChange={e => setEditing({ id: section.id, text: e.target.value })}
                          rows={Math.min(30, Math.max(8, editing.text.split('\n').length + 2))}
                          className="w-full border border-rule-strong bg-paper p-3 font-mono text-sm leading-relaxed text-ink"
                        />
                        <div className="flex gap-3">
                          <Button size="sm" onClick={handleSaveEdit}>
                            Save
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditing(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink">
                        {splitBlanks(unwrapLines(section.content)).map((part, i) =>
                          part.blank ? (
                            <mark key={i} data-blank tabIndex={-1} className="bg-ochre-tint px-0.5 text-ochre">
                              {part.text}
                            </mark>
                          ) : (
                            part.text
                          )
                        )}
                      </div>
                    )}
                  </section>
                ))}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
