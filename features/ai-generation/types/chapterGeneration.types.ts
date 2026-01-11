/**
 * Chapter Generation Types
 * Types for chapter-by-chapter tender generation orchestration
 */

/**
 * Chapter identifiers (01-09)
 */
export type ChapterId = 
  | '01' 
  | '02' 
  | '03' 
  | '04' 
  | '05' 
  | '06' 
  | '07' 
  | '08' 
  | '09';

/**
 * Chapter generation strategies
 */
export type ChapterGenerationStrategy =
  | 'TEMPLATE'              // Pure template with user inputs
  | 'AI_GENERATE'           // AI-generated content with constraints
  | 'TEMPLATE_FILL'         // Template with user data (no free AI)
  | 'USER_UPLOAD'           // User must upload file
  | 'USER_UPLOAD_AI_NOTES'; // User upload + AI adds notes

/**
 * Chapter generation status
 */
export type ChapterStatus = 
  | 'idle'       // Not started
  | 'generating' // Currently generating
  | 'completed'  // Successfully generated
  | 'failed';    // Generation failed

/**
 * Chapter metadata
 */
export interface ChapterMetadata {
  id: ChapterId;
  title: string;
  strategy: ChapterGenerationStrategy;
  requiresUserInput: boolean;
  description: string;
}

/**
 * Chapter state during generation
 */
export interface ChapterState {
  status: ChapterStatus;
  content: string | null;
  error: string | null;
  generatedAt: Date | null;
  tokenCount?: number;
  responseTimeMs?: number;
}

/**
 * Tender input form data
 */
export interface TenderInputForm {
  nameOfWork: string;
  authority: string;
  location: string;
  estimatedCost: number;
  timeForCompletion: number; // in months
  contractType: 'Item Rate' | 'Lump Sum' | 'Percentage Rate';
  emd: number; // Earnest Money Deposit
  securityDepositPercent: number;
  contractorClass: string;
  state: string;
}

/**
 * Generation mode
 */
export type GenerationMode = 'auto' | 'manual';

/**
 * Tender generation state
 */
export interface TenderGenerationState {
  tenderId: string;
  mode: GenerationMode;
  inputForm: TenderInputForm | null;
  chapters: Record<ChapterId, ChapterState>;
  isRunning: boolean;
  currentChapterId: ChapterId | null;
  error: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

/**
 * Chapter generation result
 */
export interface ChapterGenerationResult {
  success: boolean;
  content?: string;
  error?: string;
  tokenCount?: number;
  responseTimeMs?: number;
}
