'use client';

/**
 * Phase 5A: Tender Upload Component
 * Drag-and-drop file upload with processing states
 */

import { useState, useRef } from 'react';
import Button from '@/components/ui/Button';

interface TenderUploadProps {
  onUpload: (file: File) => void;
}

export default function TenderUpload({ onUpload }: TenderUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const validFile = files.find(f => f.name.endsWith('.docx') || f.name.endsWith('.pdf'));

    if (validFile) {
      onUpload(validFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        border-2 border-dashed rounded-lg p-12 text-center transition-colors
        ${isDragging ? 'border-amber-900 bg-amber-50' : 'border-gray-300 bg-gray-50'}
      `}
    >
      <div className="flex flex-col items-center">
        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mb-4">
          <span className="text-3xl">📄</span>
        </div>
        <p className="text-gray-900 font-medium mb-2">Drag & drop PWD tender documents</p>
        <p className="text-sm text-gray-600 mb-4">Supports PDF, DOCX (Max 50MB)</p>
        <Button
          type="button"
          onClick={handleBrowseClick}
          className="bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
        >
          Browse Files
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}
