'use client';

/**
 * Phase 5A: Metadata Panel
 * Document metadata and processing information
 */

export default function MetadataPanel({ metadata }: { metadata: any }) {
  return (
    <div className="p-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
        <dl className="space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-gray-600">Generated At</dt>
            <dd className="col-span-2 text-gray-900">{metadata?.generatedAt || 'N/A'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-gray-600">Pipeline Version</dt>
            <dd className="col-span-2 text-gray-900">{metadata?.pipelineVersion || 'N/A'}</dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-gray-600">Execution Time</dt>
            <dd className="col-span-2 text-gray-900">{metadata?.executionTimeMs ? `${metadata.executionTimeMs}ms` : 'N/A'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
