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
    <div className="text-center py-12">
      <Spinner size="lg" className="text-amber-900 mx-auto mb-4" />
      <p className="text-gray-900 font-medium mb-2">Processing {fileName}</p>
      <p className="text-sm text-gray-600">{STAGE_LABELS[stage]}</p>
      <div className="mt-6 flex items-center justify-center gap-2">
        <div className={`w-2 h-2 rounded-full ${stage === 'analyzing' ? 'bg-amber-900' : 'bg-gray-300'}`} />
        <div className={`w-2 h-2 rounded-full ${stage === 'scoring' ? 'bg-amber-900' : 'bg-gray-300'}`} />
        <div className={`w-2 h-2 rounded-full ${stage === 'finalizing' ? 'bg-amber-900' : 'bg-gray-300'}`} />
      </div>
    </div>
  );
}
