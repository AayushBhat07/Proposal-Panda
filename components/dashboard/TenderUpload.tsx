'use client';

/**
 * Phase 5B: Tender Upload Component
 * Drag-and-drop file upload with processing states
 * Enhanced with disabled state and error handling
 */

import { useState, useRef } from 'react';
import { FileUp } from 'lucide-react';
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
          border border-dashed p-10 text-center transition-colors
          ${
            disabled
              ? 'border-rule bg-paper cursor-not-allowed opacity-60'
              : isDragging
              ? 'border-forest bg-forest-tint'
              : 'border-rule-strong bg-sheet'
          }
        `}
      >
        <div className="flex flex-col items-center">
          <FileUp className="h-7 w-7 text-muted mb-4" strokeWidth={1.5} aria-hidden />
          <p className="font-serif text-xl text-ink mb-1">Drop the tender document here</p>
          <p className="text-sm text-muted mb-5">NIT and tender papers as PDF or DOCX, up to 50 MB</p>
          <Button type="button" onClick={handleBrowseClick} disabled={disabled}>
            Choose a file
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
        <p role="alert" className="mt-3 border-l-2 border-seal bg-seal-tint px-4 py-3 text-sm text-seal">
          {error}
        </p>
      )}
    </div>
  );
}
