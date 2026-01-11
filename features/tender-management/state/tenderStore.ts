'use client';

import { create } from 'zustand';
import { Tender, Document } from '@/types/tender.types';

interface TenderStore {
  tenders: Tender[];
  selectedTender: Tender | null;
  documents: Document[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setTenders: (tenders: Tender[]) => void;
  addTender: (tender: Tender) => void;
  updateTender: (tender: Tender) => void;
  removeTender: (id: string) => void;
  setSelectedTender: (tender: Tender | null) => void;
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  removeDocument: (id: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useTenderStore = create<TenderStore>((set) => ({
  tenders: [],
  selectedTender: null,
  documents: [],
  isLoading: false,
  error: null,
  
  setTenders: (tenders) => set({ tenders }),
  
  addTender: (tender) => set((state) => ({ 
    tenders: [tender, ...state.tenders] 
  })),
  
  updateTender: (tender) => set((state) => ({
    tenders: state.tenders.map(t => t.id === tender.id ? tender : t),
    selectedTender: state.selectedTender?.id === tender.id ? tender : state.selectedTender
  })),
  
  removeTender: (id) => set((state) => ({
    tenders: state.tenders.filter(t => t.id !== id),
    selectedTender: state.selectedTender?.id === id ? null : state.selectedTender
  })),
  
  setSelectedTender: (tender) => set({ selectedTender: tender }),
  
  setDocuments: (documents) => set({ documents }),
  
  addDocument: (document) => set((state) => ({
    documents: [...state.documents, document]
  })),
  
  removeDocument: (id) => set((state) => ({
    documents: state.documents.filter(d => d.id !== id)
  })),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  setError: (error) => set({ error }),
  
  clearError: () => set({ error: null })
}));
