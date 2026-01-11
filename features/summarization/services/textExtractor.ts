/**
 * PHASE 4A: Text Extraction Utilities
 * Extract text from .docx and other formats for summarization
 */

import * as fs from 'fs';
import * as path from 'path';

/**
 * Extract text from .docx file
 * In production, use 'mammoth' or 'docx' library
 * For Phase 4A, we use simplified extraction
 */
export async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    // For now, if .docx is not available, try to read .txt or other formats
    const ext = path.extname(filePath).toLowerCase();
    
    if (ext === '.txt' || ext === '.md') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    if (ext === '.docx') {
      // In production, use docx library
      // For Phase 4A mock, return placeholder
      console.warn('⚠️  .docx extraction not yet implemented. Please provide .txt version.');
      return 'DOCX extraction pending. Please provide text version.';
    }

    throw new Error(`Unsupported file format: ${ext}`);
  } catch (error) {
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract text from plain text file
 */
export function extractTextFromPlainText(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    return fs.readFileSync(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Extract chapter-wise text from generated tender
 * Assumes tender has chapter markers like "CHAPTER 01: TITLE"
 */
export function extractChapters(fullText: string): Array<{ chapterId: string; title: string; content: string }> {
  const chapters: Array<{ chapterId: string; title: string; content: string }> = [];
  
  // Pattern: CHAPTER 01: TITLE or Ch 01 - TITLE
  const chapterPattern = /(?:CHAPTER|Ch\.?)\s+(\d{1,2})[:\-]\s*([^\n]+)/gi;
  
  const matches = Array.from(fullText.matchAll(chapterPattern));
  
  if (matches.length === 0) {
    // No chapters found, return full text as single chapter
    return [{
      chapterId: '00',
      title: 'Full Document',
      content: fullText,
    }];
  }

  matches.forEach((match, index) => {
    const chapterId = match[1].padStart(2, '0');
    const title = match[2].trim();
    
    // Extract content from current match to next match (or end of text)
    const startIndex = match.index! + match[0].length;
    const endIndex = index < matches.length - 1 
      ? matches[index + 1].index! 
      : fullText.length;
    
    const content = fullText.substring(startIndex, endIndex).trim();
    
    chapters.push({
      chapterId,
      title,
      content,
    });
  });

  return chapters;
}

/**
 * Clean and normalize text
 * Remove excessive whitespace, page breaks, etc.
 */
export function cleanText(text: string): string {
  return text
    .replace(/\r\n/g, '\n') // Normalize line endings
    .replace(/\n{3,}/g, '\n\n') // Reduce multiple newlines
    .replace(/\t/g, '    ') // Replace tabs with spaces
    .replace(/\s+$/gm, '') // Remove trailing spaces
    .trim();
}

/**
 * Estimate token count (rough approximation)
 * 1 token ≈ 0.75 words for English
 */
export function estimateTokenCount(text: string): number {
  const words = text.split(/\s+/).filter(w => w.length > 0);
  return Math.ceil(words.length / 0.75);
}
