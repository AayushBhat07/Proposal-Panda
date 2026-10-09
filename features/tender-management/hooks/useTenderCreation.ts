'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreateTenderInput } from '@/types/tender.types';
import { useTenderStore } from '../state/tenderStore';
import { useAuthStore } from '@/state/authStore';
import * as tenderService from '../services/mockTenderService';

interface FileUploadProgress {
  [key: string]: number;
}

/**
 * Hook for tender creation workflow
 */
export function useTenderCreation() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { addTender, addDocument, setError } = useTenderStore();
  
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<FileUploadProgress>({});
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [createdTenderId, setCreatedTenderId] = useState<string | null>(null);

  /**
   * Validate tender input
   */
  const validateInput = (input: CreateTenderInput): boolean => {
    const errors: Record<string, string> = {};

    if (!input.title || input.title.trim().length === 0) {
      errors.title = 'Tender title is required';
    } else if (input.title.trim().length < 3) {
      errors.title = 'Tender title must be at least 3 characters';
    } else if (input.title.trim().length > 200) {
      errors.title = 'Tender title must be less than 200 characters';
    }

    if (input.description && input.description.length > 2000) {
      errors.description = 'Description must be less than 2000 characters';
    }

    if (input.deadline) {
      const deadlineDate = new Date(input.deadline);
      const now = new Date();
      if (deadlineDate < now) {
        errors.deadline = 'Deadline must be in the future';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  /**
   * Create a new tender
   */
  const createTender = async (input: CreateTenderInput): Promise<string | null> => {
    try {
      setIsCreating(true);
      setError(null);
      setValidationErrors({});

      // Validate input
      if (!validateInput(input)) {
        return null;
      }

      // Create tender
      const tender = await tenderService.createTender(input, user?.email);
      addTender(tender);
      setCreatedTenderId(tender.id);

      return tender.id;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create tender';
      setError(errorMessage);
      console.error('Error creating tender:', err);
      return null;
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Upload files to a tender
   */
  const uploadFiles = async (tenderId: string, files: File[]): Promise<boolean> => {
    if (files.length === 0) {
      return true; // No files to upload is valid
    }

    try {
      setIsUploading(true);
      setError(null);

      // Initialize progress for all files
      const initialProgress: FileUploadProgress = {};
      files.forEach(file => {
        initialProgress[file.name] = 0;
      });
      setUploadProgress(initialProgress);

      // Upload files sequentially to avoid overwhelming localStorage
      for (const file of files) {
        // Validate file before upload
        const validation = tenderService.validateFile(file);
        if (!validation.valid) {
          throw new Error(`${file.name}: ${validation.error}`);
        }

        // Upload with progress tracking
        const document = await tenderService.uploadDocument(
          tenderId,
          file,
          user?.email,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }));
          }
        );

        addDocument(document);
      }

      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload files';
      setError(errorMessage);
      console.error('Error uploading files:', err);
      return false;
    } finally {
      setIsUploading(false);
      setUploadProgress({});
    }
  };

  /**
   * Create tender and upload files in one workflow
   */
  const createTenderWithFiles = async (
    input: CreateTenderInput,
    files: File[]
  ): Promise<boolean> => {
    const tenderId = await createTender(input);
    if (!tenderId) {
      return false;
    }

    if (files.length > 0) {
      const uploaded = await uploadFiles(tenderId, files);
      if (!uploaded) {
        // Tender was created but files failed
        setError('Tender created, but some files failed to upload. You can upload them later.');
      }
    }

    // Navigate to tender list on success
    router.push('/tenders');
    return true;
  };

  /**
   * Reset creation state
   */
  const reset = () => {
    setIsCreating(false);
    setIsUploading(false);
    setUploadProgress({});
    setValidationErrors({});
    setCreatedTenderId(null);
    setError(null);
  };

  return {
    isCreating,
    isUploading,
    uploadProgress,
    validationErrors,
    createdTenderId,
    createTender,
    uploadFiles,
    createTenderWithFiles,
    validateInput,
    reset
  };
}
