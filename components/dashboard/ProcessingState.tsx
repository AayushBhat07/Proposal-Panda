'use client';

/**
 * Phase 5A: Processing State Component
 * Shows processing animation and status
 */

import Spinner from '@/components/ui/Spinner';

interface ProcessingStateProps {
  fileName: string;
  stage: 'analyzing' | 'scoring' | 'finalizing';
}

const STAGE_LABELS = {
  analyzing: 'Analyzing tender document...',
  scoring: 'Running compliance checks...',
  finalizing: 'Finalizing report...',
};

export default function ProcessingState({ fileName, stage }: ProcessingStateProps) {
  return (
    <div role="status" className="border border-rule-strong bg-sheet p-10 text-center">
      <Spinner size="lg" className="text-forest mx-auto mb-4" />
      <p className="font-serif text-xl text-ink mb-1 break-all">Reading {fileName}</p>
      <p className="text-sm text-muted">{STAGE_LABELS[stage]}</p>
      <div className="mt-6 flex items-center justify-center gap-1" aria-hidden>
        {(['analyzing', 'scoring', 'finalizing'] as const).map(s => (
          <div key={s} className={`h-1.5 w-10 ${s === stage ? 'bg-forest' : 'bg-rule'}`} />
        ))}
      </div>
    </div>
  );
}
