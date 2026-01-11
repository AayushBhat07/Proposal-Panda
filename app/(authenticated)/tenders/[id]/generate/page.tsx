'use client';

/**
 * Tender Generation Page
 * Main page for chapter-by-chapter tender generation
 */

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PageContainer from '@/components/layout/PageContainer';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import { useTenderStore } from '@/features/tender-management/state/tenderStore';
import { useTenderGenerationOrchestrator } from '@/features/ai-generation/hooks/useTenderGenerationOrchestrator';
import TenderGenerationInputForm from '@/features/ai-generation/components/TenderGenerationInputForm';
import GenerationModeSelector from '@/features/ai-generation/components/GenerationModeSelector';
import ChapterTOC from '@/features/ai-generation/components/ChapterTOC';
import AssembledTenderView from '@/features/ai-generation/components/AssembledTenderView';
import type { TenderInputForm, ChapterId } from '@/features/ai-generation/types/chapterGeneration.types';

type PageStep = 'form' | 'generation' | 'view';

export default function TenderGeneratePage() {
  const params = useParams();
  const router = useRouter();
  const tenderId = params.id as string;

  const { tenders } = useTenderStore();
  const tender = tenders.find((t) => t.id === tenderId);

  const [currentStep, setCurrentStep] = useState<PageStep>('form');
  const [showModeChangeConfirm, setShowModeChangeConfirm] = useState(false);

  const orchestrator = useTenderGenerationOrchestrator(tenderId);

  useEffect(() => {
    // Determine initial step based on state
    if (orchestrator.state.inputForm) {
      setCurrentStep('generation');
    }
  }, []);

  // Redirect if tender not found
  useEffect(() => {
    if (!tender) {
      router.push('/tenders');
    }
  }, [tender, router]);

  if (!tender) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center min-h-screen">
          <Spinner />
        </div>
      </PageContainer>
    );
  }

  const handleFormSubmit = (data: TenderInputForm) => {
    orchestrator.setInputForm(data);
    setCurrentStep('generation');
  };

  const handleModeChange = (newMode: 'auto' | 'manual') => {
    if (orchestrator.state.isRunning) {
      return; // Cannot change mode during generation
    }

    const hasGeneratedChapters = Object.values(orchestrator.state.chapters).some(
      (ch) => ch.status === 'completed'
    );

    if (hasGeneratedChapters) {
      setShowModeChangeConfirm(true);
      return;
    }

    orchestrator.setMode(newMode);
  };

  const confirmModeChange = (newMode: 'auto' | 'manual') => {
    orchestrator.setMode(newMode);
    setShowModeChangeConfirm(false);
  };

  const handleStartAutoGeneration = () => {
    orchestrator.generateAllChapters();
  };

  const handleGenerateChapter = (chapterId: ChapterId) => {
    orchestrator.generateChapterManual(chapterId);
  };

  const handleRegenerateChapter = (chapterId: ChapterId) => {
    orchestrator.regenerateChapter(chapterId);
  };

  const handleViewChapter = (chapterId: ChapterId) => {
    setCurrentStep('view');
    // Scroll to chapter after a brief delay to allow render
    setTimeout(() => {
      const element = document.getElementById(`chapter-${chapterId}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleBackToForm = () => {
    setCurrentStep('form');
  };

  const handleViewDocument = () => {
    setCurrentStep('view');
  };

  const handleBackToGeneration = () => {
    setCurrentStep('generation');
  };

  return (
    <PageContainer
      title={`Generate Tender: ${tender.title}`}
      description="Chapter-by-chapter AI-powered tender document generation"
    >
      {/* Step: Form */}
      {currentStep === 'form' && (
        <Card className="max-w-4xl mx-auto">
          <div className="p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Tender Generation Prerequisites
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              Provide the required information to generate the tender document. This data will be used across all chapters.
            </p>

            <TenderGenerationInputForm
              initialData={orchestrator.state.inputForm}
              onSubmit={handleFormSubmit}
            />
          </div>
        </Card>
      )}

      {/* Step: Generation */}
      {currentStep === 'generation' && (
        <div className="space-y-6">
          {/* Error Alert */}
          {orchestrator.state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="mt-1 text-sm text-red-700">{orchestrator.state.error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Progress Bar */}
          {orchestrator.state.isRunning && (
            <Card>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Generating chapters...
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {orchestrator.completionPercentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${orchestrator.completionPercentage}%` }}
                  />
                </div>
                {orchestrator.state.currentChapterId && (
                  <p className="mt-2 text-xs text-gray-600">
                    Current: Chapter {orchestrator.state.currentChapterId}
                  </p>
                )}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Controls */}
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <div className="p-6 space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Generation Controls
                    </h3>
                    <p className="text-sm text-gray-600">
                      Manage tender generation process
                    </p>
                  </div>

                  {/* Mode Selector */}
                  <GenerationModeSelector
                    selectedMode={orchestrator.state.mode}
                    onModeChange={handleModeChange}
                    disabled={orchestrator.state.isRunning}
                  />

                  {/* Action Buttons */}
                  <div className="space-y-3 pt-4 border-t">
                    {orchestrator.state.mode === 'auto' && (
                      <Button
                        onClick={handleStartAutoGeneration}
                        disabled={orchestrator.state.isRunning || orchestrator.isAllCompleted}
                        className="w-full"
                      >
                        {orchestrator.state.isRunning ? (
                          <>
                            <Spinner size="sm" className="mr-2" />
                            Generating...
                          </>
                        ) : orchestrator.isAllCompleted ? (
                          'All Chapters Generated'
                        ) : (
                          'Generate Full Tender'
                        )}
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      onClick={handleViewDocument}
                      disabled={orchestrator.completionPercentage === 0}
                      className="w-full"
                    >
                      View Assembled Document
                    </Button>

                    <Button
                      variant="outline"
                      onClick={handleBackToForm}
                      disabled={orchestrator.state.isRunning}
                      className="w-full"
                    >
                      Edit Input Data
                    </Button>
                  </div>

                  {/* Stats */}
                  <div className="pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {Object.values(orchestrator.state.chapters).filter(
                            (ch) => ch.status === 'completed'
                          ).length}
                        </p>
                        <p className="text-xs text-gray-600">Completed</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900">
                          {Object.values(orchestrator.state.chapters).filter(
                            (ch) => ch.status === 'failed'
                          ).length}
                        </p>
                        <p className="text-xs text-gray-600">Failed</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Right Panel: TOC */}
            <div className="lg:col-span-2">
              <Card>
                <div className="p-6">
                  <ChapterTOC
                    chapters={orchestrator.state.chapters}
                    mode={orchestrator.state.mode}
                    currentChapterId={orchestrator.state.currentChapterId}
                    isRunning={orchestrator.state.isRunning}
                    onGenerateChapter={handleGenerateChapter}
                    onRegenerateChapter={handleRegenerateChapter}
                    onViewChapter={handleViewChapter}
                  />
                </div>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* Step: View Document */}
      {currentStep === 'view' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <Button variant="outline" onClick={handleBackToGeneration}>
              ← Back to Generation
            </Button>
          </div>

          <AssembledTenderView
            chapters={orchestrator.state.chapters}
            tenderTitle={tender.title}
          />
        </div>
      )}

      {/* Mode Change Confirmation Modal */}
      {showModeChangeConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md">
            <div className="p-6 space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Confirm Mode Change
              </h3>
              <p className="text-sm text-gray-600">
                You have already generated some chapters. Changing the generation mode will not affect existing content, but will change how you control future generations.
              </p>
              <div className="flex space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowModeChangeConfirm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() =>
                    confirmModeChange(
                      orchestrator.state.mode === 'auto' ? 'manual' : 'auto'
                    )
                  }
                  className="flex-1"
                >
                  Confirm
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  );
}
