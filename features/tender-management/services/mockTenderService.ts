/**
 * Mock Tender Service
 * Handles tender CRUD operations and document uploads using localStorage
 */

import { Tender, CreateTenderInput, Document } from '@/types/tender.types';
import { 
  saveToLocalStorage, 
  getAllFromLocalStorage, 
  getFromLocalStorage,
  removeFromLocalStorage
} from '@/services/storage/mockStorageService';
import { mockDelay, generateId } from '@/lib/utils/delays';
import { DELAYS } from '@/lib/config/constants';

const STORAGE_KEY_TENDERS = 'tenders';
const STORAGE_KEY_DOCUMENTS = 'documents';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg'
];

/**
 * Convert File to base64 for storage
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File size exceeds 10MB limit' };
  }

  // Check file type
  if (!ALLOWED_FILE_TYPES.includes(file.type)) {
    return { valid: false, error: 'File type not supported. Please upload PDF, Word, Excel, CSV, or images only.' };
  }

  return { valid: true };
}

/**
 * Create a new tender
 */
export async function createTender(input: CreateTenderInput, userId: string = 'mock-user-id'): Promise<Tender> {
  await mockDelay(DELAYS.NORMAL);

  // Validate input
  if (!input.title || input.title.trim().length === 0) {
    throw new Error('Tender title is required');
  }

  // localStorage availability is checked by saveToLocalStorage

  const tender: Tender = {
    id: generateId(),
    title: input.title.trim(),
    description: input.description || '',
    status: 'Draft',
    organizationId: 'mock-org',
    createdBy: userId,
    createdAt: new Date(),
    updatedAt: new Date(),
    deadline: input.deadline || null,
    documentIds: []
  };

  const saved = saveToLocalStorage(STORAGE_KEY_TENDERS, tender);
  if (!saved) {
    throw new Error('Failed to save tender. Storage quota may be exceeded.');
  }

  return tender;
}

/**
 * Get all tenders
 */
export async function getTenders(): Promise<Tender[]> {
  await mockDelay(DELAYS.QUICK);

  const tenders = getAllFromLocalStorage<Tender>(STORAGE_KEY_TENDERS);
  
  // Sort by creation date (newest first)
  return tenders.sort((a, b) => {
    const dateA = typeof a.createdAt === 'string' ? new Date(a.createdAt) : a.createdAt;
    const dateB = typeof b.createdAt === 'string' ? new Date(b.createdAt) : b.createdAt;
    return dateB.getTime() - dateA.getTime();
  });
}

/**
 * Get tender by ID
 */
export async function getTenderById(id: string): Promise<Tender | null> {
  await mockDelay(DELAYS.QUICK);
  return getFromLocalStorage<Tender>(STORAGE_KEY_TENDERS, id);
}

/**
 * Update tender
 */
export async function updateTender(id: string, updates: Partial<Tender>): Promise<Tender> {
  await mockDelay(DELAYS.QUICK);

  const tender = getFromLocalStorage<Tender>(STORAGE_KEY_TENDERS, id);
  if (!tender) {
    throw new Error('Tender not found');
  }

  const updatedTender: Tender = {
    ...tender,
    ...updates,
    id: tender.id, // Prevent ID change
    updatedAt: new Date()
  };

  const saved = saveToLocalStorage(STORAGE_KEY_TENDERS, updatedTender);
  if (!saved) {
    throw new Error('Failed to update tender');
  }

  return updatedTender;
}

/**
 * Delete tender
 */
export async function deleteTender(id: string): Promise<void> {
  await mockDelay(DELAYS.QUICK);

  // Delete associated documents
  const documents = await getDocumentsByTenderId(id);
  for (const doc of documents) {
    await deleteDocument(doc.id);
  }

  const deleted = removeFromLocalStorage(STORAGE_KEY_TENDERS, id);
  if (!deleted) {
    throw new Error('Failed to delete tender');
  }
}

/**
 * Upload document to a tender
 */
export async function uploadDocument(
  tenderId: string, 
  file: File, 
  userId: string = 'mock-user-id',
  onProgress?: (progress: number) => void
): Promise<Document> {
  // Validate file
  const validation = validateFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  // Check if tender exists
  const tender = getFromLocalStorage<Tender>(STORAGE_KEY_TENDERS, tenderId);
  if (!tender) {
    throw new Error('Tender not found');
  }

  // Check for duplicate file names
  const existingDocs = await getDocumentsByTenderId(tenderId);
  if (existingDocs.some(doc => doc.fileName === file.name)) {
    throw new Error('A document with this name already exists for this tender');
  }

  // Simulate upload progress
  if (onProgress) {
    onProgress(10);
    await mockDelay(200);
    onProgress(30);
    await mockDelay(200);
    onProgress(60);
  }

  // Convert file to base64
  const base64Data = await fileToBase64(file);

  if (onProgress) {
    onProgress(80);
    await mockDelay(200);
  }

  // Create document
  const document: Document = {
    id: generateId(),
    tenderId,
    fileName: file.name,
    fileType: file.type.includes('pdf') || file.type.includes('word') ? 'unstructured' : 'structured',
    fileUrl: base64Data,
    uploadedBy: userId,
    uploadedAt: new Date(),
    size: file.size,
    extractedData: null
  };

  // Save document
  const saved = saveToLocalStorage(STORAGE_KEY_DOCUMENTS, document);
  if (!saved) {
    throw new Error('Failed to save document. Storage quota may be exceeded.');
  }

  // Update tender's documentIds
  const updatedTender: Tender = {
    ...tender,
    documentIds: [...tender.documentIds, document.id],
    updatedAt: new Date()
  };
  saveToLocalStorage(STORAGE_KEY_TENDERS, updatedTender);

  if (onProgress) {
    onProgress(100);
  }

  await mockDelay(300);

  return document;
}

/**
 * Get all documents for a tender
 */
export async function getDocumentsByTenderId(tenderId: string): Promise<Document[]> {
  await mockDelay(DELAYS.QUICK);

  const allDocs = getAllFromLocalStorage<Document>(STORAGE_KEY_DOCUMENTS);
  return allDocs.filter(doc => doc.tenderId === tenderId);
}

/**
 * Get document by ID
 */
export async function getDocumentById(id: string): Promise<Document | null> {
  await mockDelay(DELAYS.QUICK);
  return getFromLocalStorage<Document>(STORAGE_KEY_DOCUMENTS, id);
}

/**
 * Delete document
 */
export async function deleteDocument(id: string): Promise<void> {
  await mockDelay(DELAYS.QUICK);

  const document = getFromLocalStorage<Document>(STORAGE_KEY_DOCUMENTS, id);
  if (!document) {
    throw new Error('Document not found');
  }

  // Remove from storage
  removeFromLocalStorage(STORAGE_KEY_DOCUMENTS, id);

  // Update tender's documentIds
  const tender = getFromLocalStorage<Tender>(STORAGE_KEY_TENDERS, document.tenderId);
  if (tender) {
    const updatedTender: Tender = {
      ...tender,
      documentIds: tender.documentIds.filter(docId => docId !== id),
      updatedAt: new Date()
    };
    saveToLocalStorage(STORAGE_KEY_TENDERS, updatedTender);
  }
}

/**
 * Get file size limit for display
 */
export function getMaxFileSize(): number {
  return MAX_FILE_SIZE;
}

/**
 * Get allowed file types for display
 */
export function getAllowedFileTypes(): string[] {
  return ALLOWED_FILE_TYPES;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
