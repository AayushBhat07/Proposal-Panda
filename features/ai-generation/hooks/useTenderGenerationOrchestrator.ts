'use client';

/**
 * Tender Generation Orchestrator Hook
 * Manages chapter-by-chapter generation with auto/manual modes
 */

import { useState, useCallback, useEffect } from 'react';
import type {
  ChapterId,
  ChapterState,
  TenderInputForm,
  TenderGenerationState,
  GenerationMode,
} from '../types/chapterGeneration.types';
import { CHAPTER_ORDER } from '../config/chapterConfig';
import { generateChapter } from '../services/chapterGenerator';
import { checkLlmHealth } from '../services/localLlmService';

const STORAGE_KEY_PREFIX = 'tender-generation-';

/**
 * Initialize empty chapter states
 */
function initializeChapterStates(): Record<ChapterId, ChapterState> {
  const states: Partial<Record<ChapterId, ChapterState>> = {};
  CHAPTER_ORDER.forEach((id) => {
    states[id] = {
      status: 'idle',
      content: null,
      error: null,
      generatedAt: null,
    };
  });
  return states as Record<ChapterId, ChapterState>;
}

/**
 * Load generation state from localStorage
 */
function loadGenerationState(tenderId: string): TenderGenerationState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${tenderId}`;
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    
    const parsed = JSON.parse(stored);
    
    // Restore Date objects
    if (parsed.startedAt) parsed.startedAt = new Date(parsed.startedAt);
    if (parsed.completedAt) parsed.completedAt = new Date(parsed.completedAt);
    Object.keys(parsed.chapters).forEach((chapterId) => {
      const chapter = parsed.chapters[chapterId];
      if (chapter.generatedAt) {
        chapter.generatedAt = new Date(chapter.generatedAt);
      }
    });
    
    return parsed;
  } catch (error) {
    console.error('Failed to load generation state:', error);
    return null;
  }
}

/**
 * Save generation state to localStorage
 */
function saveGenerationState(state: TenderGenerationState): void {
  if (typeof window === 'undefined') return;
  
  try {
    const key = `${STORAGE_KEY_PREFIX}${state.tenderId}`;
    localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save generation state:', error);
  }
}

/**
 * Hook for tender generation orchestration
 */
export function useTenderGenerationOrchestrator(tenderId: string) {
  const [state, setState] = useState<TenderGenerationState>(() => {
    const loaded = loadGenerationState(tenderId);
    if (loaded) {
      // Reset running state on page refresh
      return {
        ...loaded,
        isRunning: false,
        currentChapterId: null,
      };
    }
    
    return {
      tenderId,
      mode: 'auto',
      inputForm: null,
      chapters: initializeChapterStates(),
      isRunning: false,
      currentChapterId: null,
      error: null,
      startedAt: null,
      completedAt: null,
    };
  });

  // Save state to localStorage on changes
  useEffect(() => {
    saveGenerationState(state);
  }, [state]);

  /**
   * Set input form
   */
  const setInputForm = useCallback((inputForm: TenderInputForm) => {
    setState((prev) => ({
      ...prev,
      inputForm,
      error: null,
    }));
  }, []);

  /**
   * Set generation mode
   */
  const setMode = useCallback((mode: GenerationMode) => {
    setState((prev) => ({
      ...prev,
      mode,
    }));
  }, []);

  /**
   * Update chapter state
   */
  const updateChapterState = useCallback((chapterId: ChapterId, updates: Partial<ChapterState>) => {
    setState((prev) => ({
      ...prev,
      chapters: {
        ...prev.chapters,
        [chapterId]: {
          ...prev.chapters[chapterId],
          ...updates,
        },
      },
    }));
  }, []);

  /**
   * Generate a single chapter
   */
  const generateSingleChapter = useCallback(async (chapterId: ChapterId): Promise<boolean> => {
    if (!state.inputForm) {
      setState((prev) => ({ ...prev, error: 'Input form is required' }));
      return false;
    }

    // Check Ollama health before generation
    const health = await checkLlmHealth();
    if (!health.available) {
      setState((prev) => ({ 
        ...prev, 
        error: health.errorMessage || 'Ollama is not available' 
      }));
      return false;
    }

    // Mark chapter as generating
    updateChapterState(chapterId, {
      status: 'generating',
      error: null,
    });

    try {
      const result = await generateChapter(chapterId, state.inputForm);

      if (result.success && result.content) {
        updateChapterState(chapterId, {
          status: 'completed',
          content: result.content,
          error: null,
          generatedAt: new Date(),
          tokenCount: result.tokenCount,
          responseTimeMs: result.responseTimeMs,
        });
        return true;
      } else {
        updateChapterState(chapterId, {
          status: 'failed',
          error: result.error || 'Generation failed',
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      updateChapterState(chapterId, {
        status: 'failed',
        error: errorMessage,
      });
      return false;
    }
  }, [state.inputForm, updateChapterState]);

  /**
   * Generate all chapters sequentially (auto mode)
   */
  const generateAllChapters = useCallback(async () => {
    if (!state.inputForm) {
      setState((prev) => ({ ...prev, error: 'Input form is required' }));
      return;
    }

    // Check Ollama health before starting
    const health = await checkLlmHealth();
    if (!health.available) {
      setState((prev) => ({ 
        ...prev, 
        error: health.errorMessage || 'Ollama is not available. Please ensure Ollama is running.' 
      }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isRunning: true,
      error: null,
      startedAt: new Date(),
      completedAt: null,
    }));

    for (const chapterId of CHAPTER_ORDER) {
      setState((prev) => ({ ...prev, currentChapterId: chapterId }));
      
      const success = await generateSingleChapter(chapterId);
      
      if (!success) {
        // Auto mode pauses on failure
        setState((prev) => ({
          ...prev,
          isRunning: false,
          currentChapterId: null,
          error: `Generation failed at Chapter ${chapterId}. Please review and retry.`,
        }));
        return;
      }
    }

    // All chapters completed
    setState((prev) => ({
      ...prev,
      isRunning: false,
      currentChapterId: null,
      completedAt: new Date(),
    }));
  }, [state.inputForm, generateSingleChapter]);

  /**
   * Generate a specific chapter (manual mode)
   */
  const generateChapterManual = useCallback(async (chapterId: ChapterId) => {
    if (!state.inputForm) {
      setState((prev) => ({ ...prev, error: 'Input form is required' }));
      return;
    }

    setState((prev) => ({
      ...prev,
      isRunning: true,
      currentChapterId: chapterId,
      error: null,
    }));

    await generateSingleChapter(chapterId);

    setState((prev) => ({
      ...prev,
      isRunning: false,
      currentChapterId: null,
    }));
  }, [state.inputForm, generateSingleChapter]);

  /**
   * Regenerate a specific chapter
   */
  const regenerateChapter = useCallback(async (chapterId: ChapterId) => {
    // Reset chapter state
    updateChapterState(chapterId, {
      status: 'idle',
      content: null,
      error: null,
      generatedAt: null,
    });

    // Generate again
    await generateChapterManual(chapterId);
  }, [generateChapterManual, updateChapterState]);

  /**
   * Reset generation state
   */
  const resetGeneration = useCallback(() => {
    setState({
      tenderId,
      mode: 'auto',
      inputForm: null,
      chapters: initializeChapterStates(),
      isRunning: false,
      currentChapterId: null,
      error: null,
      startedAt: null,
      completedAt: null,
    });

    // Clear from localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${tenderId}`);
    }
  }, [tenderId]);

  /**
   * Get completion percentage
   */
  const getCompletionPercentage = useCallback((): number => {
    const completed = CHAPTER_ORDER.filter(
      (id) => state.chapters[id].status === 'completed'
    ).length;
    return Math.round((completed / CHAPTER_ORDER.length) * 100);
  }, [state.chapters]);

  /**
   * Check if all chapters are completed
   */
  const isAllCompleted = useCallback((): boolean => {
    return CHAPTER_ORDER.every((id) => state.chapters[id].status === 'completed');
  }, [state.chapters]);

  return {
    // State
    state,
    
    // Actions
    setInputForm,
    setMode,
    generateAllChapters,
    generateChapterManual,
    regenerateChapter,
    resetGeneration,
    
    // Computed
    completionPercentage: getCompletionPercentage(),
    isAllCompleted: isAllCompleted(),
  };
}
