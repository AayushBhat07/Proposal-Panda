'use client';

import { useEffect } from 'react';
import { useTenderStore } from '../state/tenderStore';
import * as tenderService from '../services/mockTenderService';

/**
 * Hook to manage tender list
 */
export function useTenders() {
  const { 
    tenders, 
    isLoading, 
    error, 
    setTenders, 
    setLoading, 
    setError 
  } = useTenderStore();

  // Load tenders on mount
  useEffect(() => {
    loadTenders();
  }, []);

  const loadTenders = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await tenderService.getTenders();
      setTenders(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tenders';
      setError(errorMessage);
      console.error('Error loading tenders:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshTenders = async () => {
    await loadTenders();
  };

  return {
    tenders,
    isLoading,
    error,
    refreshTenders
  };
}

/**
 * Hook for tender details and documents
 */
export function useTenderDetails(tenderId: string) {
  const { 
    selectedTender, 
    documents, 
    isLoading, 
    error,
    setSelectedTender,
    setDocuments,
    setLoading,
    setError
  } = useTenderStore();

  useEffect(() => {
    loadTenderDetails();
  }, [tenderId]);

  const loadTenderDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [tender, docs] = await Promise.all([
        tenderService.getTenderById(tenderId),
        tenderService.getDocumentsByTenderId(tenderId)
      ]);

      if (!tender) {
        throw new Error('Tender not found');
      }

      setSelectedTender(tender);
      setDocuments(docs);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tender details';
      setError(errorMessage);
      console.error('Error loading tender details:', err);
    } finally {
      setLoading(false);
    }
  };

  return {
    tender: selectedTender,
    documents,
    isLoading,
    error,
    refreshDetails: loadTenderDetails
  };
}
