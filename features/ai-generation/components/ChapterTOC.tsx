'use client';

/**
 * Chapter Table of Contents
 * Displays generation status and controls for all chapters
 */

import type { ChapterId, ChapterState, GenerationMode } from '../types/chapterGeneration.types';
import { CHAPTER_ORDER, getChapterMetadata } from '../config/chapterConfig';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';

interface ChapterTOCProps {
  chapters: Record<ChapterId, ChapterState>;
  mode: GenerationMode;
  currentChapterId: ChapterId | null;
  isRunning: boolean;
  onGenerateChapter?: (chapterId: ChapterId) => void;
  onRegenerateChapter?: (chapterId: ChapterId) => void;
  onViewChapter?: (chapterId: ChapterId) => void;
}

export default function ChapterTOC({
  chapters,
  mode,
  currentChapterId,
  isRunning,
  onGenerateChapter,
  onRegenerateChapter,
  onViewChapter,
}: ChapterTOCProps) {
  const getStatusBadge = (status: ChapterState['status'], chapterId: ChapterId) => {
    const isCurrentlyGenerating = isRunning && currentChapterId === chapterId;

    if (isCurrentlyGenerating) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
          <Spinner size="sm" className="mr-1" />
          Generating
        </span>
      );
    }

    switch (status) {
      case 'idle':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            Not Started
          </span>
        );
      case 'generating':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
            <Spinner size="sm" className="mr-1" />
            Generating
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
            ✓ Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
            ✗ Failed
          </span>
        );
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700 mb-3">
        Table of Contents (9 Chapters)
      </h3>

      {CHAPTER_ORDER.map((chapterId) => {
        const metadata = getChapterMetadata(chapterId);
        const chapterState = chapters[chapterId];
        const canGenerate = mode === 'manual' && !isRunning && chapterState.status === 'idle';
        const canRegenerate = mode === 'manual' && !isRunning && 
          (chapterState.status === 'completed' || chapterState.status === 'failed');

        return (
          <div
            key={chapterId}
            className={`p-4 border rounded-lg transition-all ${
              currentChapterId === chapterId && isRunning
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-sm font-mono text-gray-500">Ch {chapterId}</span>
                  <h4 className="text-sm font-medium text-gray-900 truncate">
                    {metadata.title}
                  </h4>
                </div>
                <p className="text-xs text-gray-600 mb-2">{metadata.description}</p>
                <div className="flex items-center space-x-2">
                  {getStatusBadge(chapterState.status, chapterId)}
                  {metadata.requiresUserInput && (
                    <span className="text-xs text-gray-500">
                      (Requires user input)
                    </span>
                  )}
                </div>
                {chapterState.error && (
                  <p className="mt-2 text-xs text-red-600">{chapterState.error}</p>
                )}
                {chapterState.generatedAt && (
                  <p className="mt-1 text-xs text-gray-500">
                    Generated: {new Date(chapterState.generatedAt).toLocaleString('en-IN')}
                    {chapterState.responseTimeMs && ` (${(chapterState.responseTimeMs / 1000).toFixed(1)}s)`}
                  </p>
                )}
              </div>

              <div className="ml-4 flex flex-col space-y-2">
                {canGenerate && onGenerateChapter && (
                  <Button
                    size="sm"
                    onClick={() => onGenerateChapter(chapterId)}
                  >
                    Generate
                  </Button>
                )}
                {canRegenerate && onRegenerateChapter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onRegenerateChapter(chapterId)}
                  >
                    Regenerate
                  </Button>
                )}
                {chapterState.status === 'completed' && onViewChapter && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onViewChapter(chapterId)}
                  >
                    View
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
