'use client';

/**
 * Phase 5A: Metadata Panel
 * Document metadata and processing information
 */

export default function MetadataPanel({ metadata }: { metadata: any }) {
  return (
    <div>
      <div className="border border-rule-strong bg-sheet p-6">
        <h3 className="font-serif text-xl font-semibold text-ink mb-4">Metadata</h3>
        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-muted">Generated At</dt>
            <dd className="col-span-2 text-ink">{metadata?.generatedAt || 'N/A'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-muted">Pipeline Version</dt>
            <dd className="col-span-2 text-ink">{metadata?.pipelineVersion || 'N/A'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-muted">Execution Time</dt>
            <dd className="col-span-2 text-ink">{metadata?.executionTimeMs ? `${metadata.executionTimeMs}ms` : 'N/A'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
