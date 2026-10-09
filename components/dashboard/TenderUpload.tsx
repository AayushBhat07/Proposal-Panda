'use client';

/**
 * Phase 5B: Tender Upload Component
 * Drag-and-drop file upload with processing states
 * Enhanced with disabled state and error handling
 */

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';

interface TenderUploadProps {
  onUpload: (file: File) => void;
  disabled?: boolean;
}

export default function TenderUpload({ onUpload, disabled = false }: TenderUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setError(null);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f => /\.(?:pdf|docx)$/i.test(f.name));

    if (!validFile) {
      setError('Please upload a PDF or DOCX file');
      return;
    }

    if (validFile.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    onUpload(validFile);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const file = e.target.files?.[0];
    
    if (!file) return;

    if (!/\.(?:pdf|docx)$/i.test(file.name)) {
      setError('Please upload a PDF or DOCX file');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('File size must be less than 50MB');
      return;
    }

    onUpload(file);
  };

  const handleBrowseClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${
            disabled
              ? 'border-gray-200 bg-gray-100 cursor-not-allowed opacity-60'
              : isDragging
              ? 'border-amber-900 bg-amber-50'
              : 'border-gray-300 bg-gray-50'
          }
        `}
      >
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
            <span className="text-3xl">📄</span>
          </div>
          <p className={`font-medium mb-2 ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>
            Drag & drop PWD tender documents
          </p>
          <p className="text-sm text-gray-600 mb-4">Supports PDF, DOCX (Max 50MB)</p>
          <Button
            type="button"
            onClick={handleBrowseClick}
            disabled={disabled}
            className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Browse Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileSelect}
            disabled={disabled}
            className="hidden"
          />
        </div>
      </div>
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          <span className="font-medium">⚠️ Error:</span> {error}
        </div>
      )}
    </div>
  );
}
