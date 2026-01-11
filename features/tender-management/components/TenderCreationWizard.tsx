'use client';

import { useState, FormEvent } from 'react';
import { CreateTenderInput } from '@/types/tender.types';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import FileUploader from './FileUploader';
import { useTenderCreation } from '../hooks/useTenderCreation';
import { useTenderStore } from '../state/tenderStore';

export default function TenderCreationWizard() {
  const { error: storeError } = useTenderStore();
  const {
    isCreating,
    isUploading,
    uploadProgress,
    validationErrors,
    createTenderWithFiles,
    reset
  } = useTenderCreation();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const input: CreateTenderInput = {
      title,
      description,
      deadline: deadline ? new Date(deadline) : undefined
    };

    const success = await createTenderWithFiles(input, selectedFiles);
    
    if (success) {
      // Reset form
      setTitle('');
      setDescription('');
      setDeadline('');
      setSelectedFiles([]);
      reset();
    }
  };

  const handleCancel = () => {
    setTitle('');
    setDescription('');
    setDeadline('');
    setSelectedFiles([]);
    reset();
  };

  const isFormDisabled = isCreating || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {storeError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path 
                fillRule="evenodd" 
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                clipRule="evenodd" 
              />
            </svg>
            <p className="text-sm font-medium">{storeError}</p>
          </div>
        </div>
      )}

      {/* Basic Information */}
      <Card variant="bordered">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>
        
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Tender Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isFormDisabled}
              placeholder="Enter tender title"
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${validationErrors.title ? 'border-red-300' : 'border-gray-300'}
              `}
            />
            {validationErrors.title && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isFormDisabled}
              placeholder="Enter tender description (optional)"
              rows={4}
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${validationErrors.description ? 'border-red-300' : 'border-gray-300'}
              `}
            />
            {validationErrors.description && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              {description.length}/2000 characters
            </p>
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              id="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={isFormDisabled}
              min={new Date().toISOString().split('T')[0]}
              className={`
                w-full px-3 py-2 border rounded-md shadow-sm
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
                disabled:bg-gray-100 disabled:cursor-not-allowed
                ${validationErrors.deadline ? 'border-red-300' : 'border-gray-300'}
              `}
            />
            {validationErrors.deadline && (
              <p className="mt-1 text-sm text-red-600">{validationErrors.deadline}</p>
            )}
          </div>
        </div>
      </Card>

      {/* Document Upload */}
      <Card variant="bordered">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Documents</h2>
        <p className="text-sm text-gray-600 mb-4">
          Upload tender documents (optional). You can also add documents later.
        </p>
        
        <FileUploader
          onFilesSelected={setSelectedFiles}
          selectedFiles={selectedFiles}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
        />
      </Card>

      {/* Action Buttons */}
      <div className="flex items-center justify-end space-x-3">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isFormDisabled}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          isLoading={isCreating || isUploading}
          disabled={isFormDisabled || !title.trim()}
        >
          {isCreating ? 'Creating...' : isUploading ? 'Uploading...' : 'Create Tender'}
        </Button>
      </div>

      {/* Upload Status */}
      {isUploading && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md">
          <div className="flex items-center">
            <svg className="animate-spin h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path 
                className="opacity-75" 
                fill="currentColor" 
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" 
              />
            </svg>
            <p className="text-sm font-medium">Uploading documents...</p>
          </div>
        </div>
      )}
    </form>
  );
}
