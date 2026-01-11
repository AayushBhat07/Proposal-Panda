'use client';

/**
 * Generation Mode Selector
 * Allows users to choose between auto and manual generation modes
 */

import type { GenerationMode } from '../types/chapterGeneration.types';

interface GenerationModeSelectorProps {
  selectedMode: GenerationMode;
  onModeChange: (mode: GenerationMode) => void;
  disabled?: boolean;
}

export default function GenerationModeSelector({
  selectedMode,
  onModeChange,
  disabled = false,
}: GenerationModeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Generation Mode
      </label>

      <div className="space-y-2">
        {/* Auto mode */}
        <label
          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedMode === 'auto'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name="generationMode"
            value="auto"
            checked={selectedMode === 'auto'}
            onChange={() => !disabled && onModeChange('auto')}
            disabled={disabled}
            className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center">
              <span className="font-medium text-gray-900">
                Auto-generate full tender
              </span>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 rounded">
                Recommended
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Automatically generates all 9 chapters sequentially. Ideal for most users.
            </p>
          </div>
        </label>

        {/* Manual mode */}
        <label
          className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
            selectedMode === 'manual'
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            type="radio"
            name="generationMode"
            value="manual"
            checked={selectedMode === 'manual'}
            onChange={() => !disabled && onModeChange('manual')}
            disabled={disabled}
            className="mt-1 mr-3 text-blue-600 focus:ring-blue-500"
          />
          <div className="flex-1">
            <div className="flex items-center">
              <span className="font-medium text-gray-900">
                Generate chapter-by-chapter
              </span>
              <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800 rounded">
                Advanced
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-600">
              Manually control generation of each chapter. Use for selective regeneration or custom workflows.
            </p>
          </div>
        </label>
      </div>
    </div>
  );
}
