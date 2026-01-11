/**
 * PHASE 4A: Text Extraction Utilities
 * Extract text from .docx and other formats for summarization
 */

import * as fs from 'fs';
import * as path from 'path';
import mammoth from 'mammoth';

/**
 * Extract text from .docx file
 * Uses mammoth library for reliable extraction
 */
export async function extractTextFromDocx(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();
    
    // Handle plain text formats
    if (ext === '.txt' || ext === '.md') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    // Handle .docx format
    if (ext === '.docx') {
      console.log(`📄 Extracting text from .docx file...`);
      
      // Read the .docx file
      const buffer = fs.readFileSync(filePath);
      
      // Extract text using mammoth
      const result = await mammoth.extractRawText({ buffer });
      const extractedText = result.value;
      
      if (extractedText.length < 100) {
        console.warn('⚠️  Limited text extracted from .docx. File may be empty or corrupted.');
      } else {
        console.log(`✓ Extracted ${extractedText.length} characters from .docx`);
      }
      
      return extractedText || 'Failed to extract meaningful text from .docx';
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
