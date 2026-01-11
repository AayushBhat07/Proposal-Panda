'use client';

/**
 * Assembled Tender View
 * Displays all generated chapters in order with placeholders for pending chapters
 */

import { useRef } from 'react';
import type { ChapterId, ChapterState } from '../types/chapterGeneration.types';
import { CHAPTER_ORDER, getChapterMetadata } from '../config/chapterConfig';
import Button from '@/components/ui/Button';

interface AssembledTenderViewProps {
  chapters: Record<ChapterId, ChapterState>;
  tenderTitle: string;
}

export default function AssembledTenderView({
  chapters,
  tenderTitle,
}: AssembledTenderViewProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handleScrollToChapter = (chapterId: ChapterId) => {
    const element = document.getElementById(`chapter-${chapterId}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasAnyContent = CHAPTER_ORDER.some(
    (id) => chapters[id].status === 'completed'
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Assembled Tender Document
          </h2>
          <p className="mt-1 text-sm text-gray-600">{tenderTitle}</p>
        </div>
      </div>

      {!hasAnyContent ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">
            No chapters generated yet. Start generation to view content.
          </p>
        </div>
      ) : (
        <>
          {/* Quick Navigation */}
          <div className="bg-white border rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Quick Navigation
            </h3>
            <div className="flex flex-wrap gap-2">
              {CHAPTER_ORDER.map((chapterId) => {
                const metadata = getChapterMetadata(chapterId);
                const chapterState = chapters[chapterId];
                const isCompleted = chapterState.status === 'completed';

                return (
                  <button
                    key={chapterId}
                    onClick={() => handleScrollToChapter(chapterId)}
                    disabled={!isCompleted}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      isCompleted
                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    Ch {chapterId}: {metadata.title}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Document Content */}
          <div
            ref={contentRef}
            className="bg-white border rounded-lg overflow-hidden"
          >
            <div className="max-w-4xl mx-auto p-8 space-y-8">
              {/* Document Title */}
              <div className="text-center border-b pb-6">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  TENDER DOCUMENT
                </h1>
                <p className="text-lg text-gray-700">{tenderTitle}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Generated on {new Date().toLocaleDateString('en-IN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              {/* Chapters */}
              {CHAPTER_ORDER.map((chapterId) => {
                const metadata = getChapterMetadata(chapterId);
                const chapterState = chapters[chapterId];

                return (
                  <div
                    key={chapterId}
                    id={`chapter-${chapterId}`}
                    className="scroll-mt-4"
                  >
                    {chapterState.status === 'completed' && chapterState.content ? (
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
                          {chapterState.content}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gray-50 border-2 border-dashed rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">
                          Chapter {chapterId}: {metadata.title}
                        </h3>
                        <div className="space-y-2">
                          {chapterState.status === 'idle' && (
                            <p className="text-sm text-gray-600">
                              ⏳ Pending generation
                            </p>
                          )}
                          {chapterState.status === 'generating' && (
                            <p className="text-sm text-blue-600">
                              🔄 Currently generating...
                            </p>
                          )}
                          {chapterState.status === 'failed' && (
                            <div>
                              <p className="text-sm text-red-600 mb-1">
                                ✗ Generation failed
                              </p>
                              {chapterState.error && (
                                <p className="text-xs text-red-500">
                                  Error: {chapterState.error}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
