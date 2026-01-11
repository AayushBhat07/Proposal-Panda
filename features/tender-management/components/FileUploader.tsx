'use client';

import { useState, useRef, DragEvent, ChangeEvent } from 'react';
import Button from '@/components/ui/Button';
import * as tenderService from '../services/mockTenderService';

interface FileUploaderProps {
  onFilesSelected: (files: File[]) => void;
  selectedFiles: File[];
  isUploading?: boolean;
  uploadProgress?: Record<string, number>;
  maxFiles?: number;
}

export default function FileUploader({ 
  onFilesSelected, 
  selectedFiles,
  isUploading = false,
  uploadProgress = {},
  maxFiles = 10
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      handleFiles(newFiles);
    }
  };

  const handleFiles = (newFiles: File[]) => {
    setError(null);

    // Check file count
    if (selectedFiles.length + newFiles.length > maxFiles) {
      setError(`You can only upload up to ${maxFiles} files`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    const errors: string[] = [];

    for (const file of newFiles) {
      // Check for duplicates
      if (selectedFiles.some(f => f.name === file.name)) {
        errors.push(`${file.name}: Duplicate file name`);
        continue;
      }

      // Validate file
      const validation = tenderService.validateFile(file);
      if (!validation.valid) {
        errors.push(`${file.name}: ${validation.error}`);
      } else {
        validFiles.push(file);
      }
    }

    if (errors.length > 0) {
      setError(errors.join('\n'));
    }

    if (validFiles.length > 0) {
      onFilesSelected([...selectedFiles, ...validFiles]);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFilesSelected(newFiles);
    setError(null);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const formatFileSize = (bytes: number): string => {
    return tenderService.formatFileSize(bytes);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center transition-colors
          ${isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }
          ${isUploading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
        onClick={!isUploading ? handleBrowseClick : undefined}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileInputChange}
          disabled={isUploading}
          className="hidden"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
        />
        
        <svg 
          className="mx-auto h-12 w-12 text-gray-400" 
          stroke="currentColor" 
          fill="none" 
          viewBox="0 0 48 48"
        >
          <path 
            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
          />
        </svg>
        
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-semibold text-blue-600">Click to browse</span> or drag and drop
        </p>
        <p className="mt-1 text-xs text-gray-500">
          PDF, Word, Excel, CSV, or Images (max 10MB per file)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm whitespace-pre-line">
          {error}
        </div>
      )}

      {/* File List */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">
            Selected Files ({selectedFiles.length}/{maxFiles})
          </h4>
          <div className="space-y-2">
            {selectedFiles.map((file, index) => {
              const progress = uploadProgress[file.name];
              const isThisFileUploading = progress !== undefined && progress < 100;

              return (
                <div 
                  key={`${file.name}-${index}`}
                  className="flex items-center justify-between bg-white border border-gray-200 rounded-md px-4 py-3"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <svg 
                      className="h-5 w-5 text-gray-400 flex-shrink-0" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    <div className="ml-3 flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>

                  {/* Upload Progress */}
                  {isThisFileUploading && (
                    <div className="ml-4 flex items-center">
                      <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-600">{progress}%</span>
                    </div>
                  )}

                  {/* Remove Button */}
                  {!isUploading && (
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(index)}
                      className="ml-4 text-red-600 hover:text-red-800 transition-colors"
                    >
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path 
                          fillRule="evenodd" 
                          d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
