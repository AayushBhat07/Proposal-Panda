'use client';

/**
 * Foundation bid for an analysed tender: generate it with the local model, read it, download it.
 */

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useAuthStore } from '@/state/authStore';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { getFromLocalStorage, saveToLocalStorage } from '@/services/storage/mockStorageService';
import type { BidCover, FoundationBid } from '@/features/bid-generation';

const COVERS: Array<{ cover: BidCover; title: string }> = [
  { cover: 'technical', title: 'Cover I: Technical Bid' },
  { cover: 'financial', title: 'Cover II: Financial Bid' },
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
      ...COVERS.flatMap(({ cover, title }) => [
        `# ${title}`,
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
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" className="text-amber-900" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="p-6 max-w-3xl mx-auto text-center text-gray-600">
        <p className="mb-4">This tender hasn&apos;t been analysed in this browser yet.</p>
        <Button variant="outline" onClick={() => router.push('/dashboard')}>
          Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500">{id}</p>
          <h1 className="text-2xl font-bold text-gray-900">Foundation Bid</h1>
          {bid && (
            <p className="text-xs text-gray-500 mt-1">
              Drafted by {bid.modelUsed} on {new Date(bid.generatedAt).toLocaleString()}. Review every section before
              submitting.
            </p>
          )}
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.push(`/tenders/${id}/analysis`)}>
            Back to Analysis
          </Button>
          {bid && (
            <Button variant="outline" onClick={handleDownload}>
              Download (.md)
            </Button>
          )}
          {can('bid.generate') && (
            <Button
              onClick={handleGenerate}
              isLoading={isGenerating}
              disabled={isGenerating || !companyProfile}
              className="bg-amber-900 hover:bg-amber-800 focus:ring-amber-900"
            >
              {bid ? 'Regenerate' : 'Generate Foundation Bid'}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">{error}</div>
      )}

      {isGenerating && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md text-sm text-amber-900">
          Drafting each section on the local model. This can take several minutes on CPU.
        </div>
      )}

      {!bid && !isGenerating && (
        <div className="p-12 text-center bg-white border border-gray-200 rounded-lg text-gray-600">
          {can('bid.generate')
            ? 'No bid yet. Generate a first draft from this tender analysis and your company profile.'
            : 'No bid has been generated for this tender yet. Ask a Bid Writer or Admin to generate one.'}
        </div>
      )}

      {bid && (
        <div className="space-y-10">
          {COVERS.map(({ cover, title }) => (
            <div key={cover} className="space-y-6">
              <h2 className="text-xl font-bold text-gray-900">{title}</h2>
              {bid.sections
                .filter(section => section.cover === cover)
                .map(section => (
                  <section key={section.id} className="bg-white border border-gray-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                      <span className="text-xs text-gray-500">
                        {section.source === 'model' ? `Drafted by ${bid.modelUsed}` : 'Standard proforma'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">{section.content}</div>
                  </section>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
