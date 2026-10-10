/**
 * PHASE 4A: Text Extraction Utilities
 * Extract text from .docx and other formats for summarization
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import mammoth from 'mammoth';
import { getDocumentProxy } from 'unpdf';

const run = promisify(execFile);

/** Below this many letters/digits a PDF is treated as having no text layer. */
const MIN_TEXT_CHARS = 200;
/** OCR is slow (a few seconds a page); NIT, eligibility and key conditions sit in the first pages. */
const MAX_OCR_PAGES = 40;

const meaningfulChars = (text: string) => (text.match(/[\p{L}\p{N}]/gu) ?? []).length;

/** The uploaded document has no usable text. The message is safe to show the user. */
export class UnreadableDocumentError extends Error {
  name = 'UnreadableDocumentError';
}

/**
 * PDF text with its line and page breaks kept. The patterns that find the NIT number, EMD, office and contract
 * clauses work line by line, so flattening a PDF into one line (as a plain merge does) breaks them.
 */
export async function extractPdfText(filePath: string): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(fs.readFileSync(filePath)));
  const pages: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();
    let text = '';
    for (const item of content.items) {
      if ('str' in item) text += item.str + (item.hasEOL ? '\n' : '');
    }
    pages.push(text.replace(/[ \t]+\n/g, '\n').trim());
  }
  return pages.join('\n\n');
}

/** OCR a scanned PDF with poppler + tesseract when both are installed; undefined when they aren't. */
async function ocrPdf(filePath: string): Promise<string | undefined> {
  try {
    await run('pdftoppm', ['-v']);
    await run('tesseract', ['--version']);
  } catch {
    return undefined;
  }
  const { stdout: langList } = await run('tesseract', ['--list-langs']);
  const langs = ['eng', 'hin'].filter(l => langList.split('\n').includes(l)).join('+') || 'eng';
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tender-ocr-'));
  try {
    await run('pdftoppm', ['-r', '200', '-gray', '-png', '-l', String(MAX_OCR_PAGES), filePath, path.join(dir, 'p')], {
      timeout: 300000,
    });
    const images = fs.readdirSync(dir).filter(f => f.endsWith('.png')).sort();
    const pages: string[] = [];
    for (const image of images) {
      const { stdout } = await run('tesseract', [path.join(dir, image), '-', '-l', langs], {
        timeout: 120000,
        maxBuffer: 16 * 1024 * 1024,
      });
      pages.push(stdout.trim());
    }
    console.log(`📄 OCR read ${images.length} page(s) with tesseract (${langs})`);
    return pages.join('\n\n');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

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
      
      if (meaningfulChars(extractedText) < MIN_TEXT_CHARS) {
        throw new UnreadableDocumentError('No readable text found in the .docx. Check that it is the tender document and not empty.');
      }
      console.log(`✓ Extracted ${extractedText.length} characters from .docx`);
      return extractedText;
    }

    // Handle .pdf format: the text layer, or OCR when the PDF is a scan
    if (ext === '.pdf') {
      const text = await extractPdfText(filePath);
      if (meaningfulChars(text) >= MIN_TEXT_CHARS) return text;
      const ocr = await ocrPdf(filePath);
      if (ocr === undefined) {
        throw new UnreadableDocumentError(
          'No text layer found in PDF (it looks scanned). Install poppler and tesseract (brew install poppler tesseract) ' +
            'to read scans, or upload a text PDF.'
        );
      }
      if (meaningfulChars(ocr) < MIN_TEXT_CHARS) {
        throw new UnreadableDocumentError('No readable text found in PDF, even with OCR. Upload a clearer scan or a text PDF.');
      }
      return ocr;
    }

    throw new Error(`Unsupported file format: ${ext}`);
  } catch (error) {
    if (error instanceof UnreadableDocumentError) throw error;
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
