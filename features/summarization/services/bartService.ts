/**
 * PHASE 4A: BART Model Service
 * Local BART integration for tender summarization
 * STRICTLY BART ONLY - No generative or reasoning models
 */

import type {
  TenderDocumentInput,
  TenderSummary,
  SummarizationOptions,
  SummarizationResult,
  TextChunk,
} from '../types/summarization.types';

/**
 * BART Summarization Service
 * Uses local BART model for faithful, non-interpretive summarization
 * 
 * RULES:
 * - BART ONLY (no LLaMA, no GPT, no reasoning models)
 * - Extractive/abstractive summarization only
 * - No hallucination
 * - No interpretation
 * - No judgment
 * - No scoring
 */
export class BARTSummarizationService {
  private model: 'BART-large-cnn' | 'BART-base';
  private maxTokensPerChunk: number;
  private overlapTokens: number;

  constructor(options: SummarizationOptions = {}) {
    this.model = options.model || 'BART-large-cnn';
    this.maxTokensPerChunk = options.maxTokensPerChunk || 1024;
    this.overlapTokens = options.overlapTokens || 100;
  }

  /**
   * Summarize tender document
   * Main entry point for BART-based summarization
   */
  async summarizeTender(
    input: TenderDocumentInput,
    options: SummarizationOptions = {}
  ): Promise<SummarizationResult> {
    const startTime = Date.now();
    const diagnostics = {
      inputLength: input.fullText.length,
      chunksProcessed: 0,
      averageChunkLength: 0,
      totalTokensProcessed: 0,
      processingTimeMs: 0,
      errors: [] as string[],
      warnings: [] as string[],
    };

    try {
      // Step 1: Chunk the text
      const chunks = this.chunkText(input.fullText, input.chapters);
      diagnostics.chunksProcessed = chunks.length;
      diagnostics.totalTokensProcessed = chunks.reduce((sum, c) => sum + c.tokenCount, 0);
      diagnostics.averageChunkLength = diagnostics.totalTokensProcessed / chunks.length;

      if (chunks.length === 0) {
        diagnostics.errors.push('No text chunks generated from input');
        throw new Error('Empty input document');
      }

      // Step 2: Generate summaries for each section
      const [
        executiveSummary,
        commercialTerms,
        datesAndObligations,
        technicalScope,
        legalHighlights,
        attentionPoints,
      ] = await Promise.all([
        this.generateExecutiveSummary(chunks),
        this.generateCommercialTerms(chunks),
        this.generateDatesAndObligations(chunks),
        this.generateTechnicalScope(chunks),
        this.generateLegalHighlights(chunks),
        this.generateAttentionPoints(chunks),
      ]);

      const processingTimeMs = Date.now() - startTime;
      diagnostics.processingTimeMs = processingTimeMs;

      const summary: TenderSummary = {
        executiveSummary,
        commercialTerms,
        datesAndObligations,
        technicalScope,
        legalHighlights,
        attentionPoints,
        metadata: {
          tenderId: input.tenderId,
          tenderTitle: input.tenderTitle,
          generatedAt: new Date(),
          modelUsed: this.model,
          totalChunks: chunks.length,
          processingTimeMs,
        },
      };

      return {
        summary,
        diagnostics,
      };
    } catch (error) {
      diagnostics.errors.push(error instanceof Error ? error.message : String(error));
      throw error;
    }
  }

  /**
   * Chunk text for BART processing
   * BART has token limits (1024 typically), so we need to chunk long documents
   */
  private chunkText(fullText: string, chapters?: TenderDocumentInput['chapters']): TextChunk[] {
    const chunks: TextChunk[] = [];

    // If chapters are provided, chunk by chapter
    if (chapters && chapters.length > 0) {
      chapters.forEach((chapter, index) => {
        const chapterChunks = this.splitIntoChunks(
          chapter.content,
          `Chapter ${chapter.chapterId}: ${chapter.title}`
        );
        chunks.push(...chapterChunks.map((c, i) => ({
          ...c,
          index: chunks.length + i,
        })));
      });
    } else {
      // Otherwise, chunk the full text
      const textChunks = this.splitIntoChunks(fullText, 'Full Text');
      chunks.push(...textChunks);
    }

    return chunks;
  }

  /**
   * Split text into manageable chunks with overlap
   */
  private splitIntoChunks(text: string, source: string): TextChunk[] {
    const chunks: TextChunk[] = [];
    const words = text.split(/\s+/);
    
    // Approximate tokens (1 token ≈ 0.75 words for English)
    const wordsPerChunk = Math.floor(this.maxTokensPerChunk * 0.75);
    const overlapWords = Math.floor(this.overlapTokens * 0.75);

    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < words.length) {
      const endIndex = Math.min(startIndex + wordsPerChunk, words.length);
      const chunkWords = words.slice(startIndex, endIndex);
      const chunkText = chunkWords.join(' ');

      chunks.push({
        index: chunkIndex,
        text: chunkText,
        tokenCount: Math.ceil(chunkWords.length / 0.75),
        source,
      });

      startIndex += wordsPerChunk - overlapWords;
      chunkIndex++;
    }

    return chunks;
  }

  /**
   * Generate Executive Summary
   * Focus: High-level project overview, scope, authority, value, duration
   */
  private async generateExecutiveSummary(chunks: TextChunk[]): Promise<string> {
    // Extract relevant chunks (typically first 3-5 chapters)
    const relevantChunks = chunks.filter(c => 
      c.source.includes('Chapter 01') || 
      c.source.includes('Chapter 02') ||
      c.source.includes('Chapter 03')
    ).slice(0, 5);

    const combinedText = relevantChunks.length > 0 
      ? relevantChunks.map(c => c.text).join('\n\n')
      : chunks.slice(0, 3).map(c => c.text).join('\n\n');

    // MOCK: In production, this would call local BART model
    return await this.mockBARTSummarize(
      combinedText,
      'Extract: project name, scope of work, executing authority, location, contract value, duration. Be factual and concise.'
    );
  }

  /**
   * Generate Commercial Terms
   * Focus: EMD, performance security, completion period, defect liability
   */
  private async generateCommercialTerms(chunks: TextChunk[]): Promise<string> {
    const relevantChunks = chunks.filter(c =>
      c.text.toLowerCase().includes('emd') ||
      c.text.toLowerCase().includes('earnest money') ||
      c.text.toLowerCase().includes('performance') ||
      c.text.toLowerCase().includes('security') ||
      c.text.toLowerCase().includes('completion period')
    ).slice(0, 5);

    const combinedText = relevantChunks.length > 0
      ? relevantChunks.map(c => c.text).join('\n\n')
      : chunks.slice(0, 5).map(c => c.text).join('\n\n');

    return await this.mockBARTSummarize(
      combinedText,
      'Extract: EMD amount, performance guarantee, completion period, defect liability, tender type. List factually.'
    );
  }

  /**
   * Generate Dates and Obligations
   * Focus: Submission deadlines, validity, extension obligations
   */
  private async generateDatesAndObligations(chunks: TextChunk[]): Promise<string> {
    const relevantChunks = chunks.filter(c =>
      c.text.toLowerCase().includes('date') ||
      c.text.toLowerCase().includes('submission') ||
      c.text.toLowerCase().includes('validity') ||
      c.text.toLowerCase().includes('deadline')
    ).slice(0, 5);

    const combinedText = relevantChunks.length > 0
      ? relevantChunks.map(c => c.text).join('\n\n')
      : chunks.slice(0, 5).map(c => c.text).join('\n\n');

    return await this.mockBARTSummarize(
      combinedText,
      'Extract: submission requirements, bid validity, extension obligations, key dates. Be specific.'
    );
  }

  /**
   * Generate Technical Scope
   * Focus: Nature of works, work categories, complexity (descriptive, not scored)
   */
  private async generateTechnicalScope(chunks: TextChunk[]): Promise<string> {
    const relevantChunks = chunks.filter(c =>
      c.source.includes('Chapter 04') ||
      c.source.includes('Chapter 05') ||
      c.source.includes('Chapter 06') ||
      c.text.toLowerCase().includes('specification') ||
      c.text.toLowerCase().includes('technical')
    ).slice(0, 8);

    const combinedText = relevantChunks.length > 0
      ? relevantChunks.map(c => c.text).join('\n\n')
      : chunks.slice(3, 10).map(c => c.text).join('\n\n');

    return await this.mockBARTSummarize(
      combinedText,
      'Extract: nature of works, major work categories (earthwork, concrete, drainage, etc.), execution scope. Describe factually, do not judge.'
    );
  }

  /**
   * Generate Legal Highlights
   * Focus: Bonds, guarantees, authority hierarchy, jurisdiction
   */
  private async generateLegalHighlights(chunks: TextChunk[]): Promise<string> {
    const relevantChunks = chunks.filter(c =>
      c.text.toLowerCase().includes('bond') ||
      c.text.toLowerCase().includes('guarantee') ||
      c.text.toLowerCase().includes('authority') ||
      c.text.toLowerCase().includes('jurisdiction') ||
      c.text.toLowerCase().includes('legal') ||
      c.text.toLowerCase().includes('contract')
    ).slice(0, 5);

    const combinedText = relevantChunks.length > 0
      ? relevantChunks.map(c => c.text).join('\n\n')
      : chunks.slice(2, 7).map(c => c.text).join('\n\n');

    return await this.mockBARTSummarize(
      combinedText,
      'Extract: bond requirements, guarantee obligations, authority hierarchy, jurisdiction references. State what the tender requires.'
    );
  }

  /**
   * Generate Attention Points (FACTUAL ONLY)
   * Focus: Long execution periods, high security, extensive scope, repeated obligations
   * NOT A RISK ASSESSMENT - only factual summary
   */
  private async generateAttentionPoints(chunks: TextChunk[]): Promise<string> {
    const allText = chunks.map(c => c.text).join('\n\n');

    return await this.mockBARTSummarize(
      allText,
      'Extract: long execution periods, high security requirements, extensive technical scope, any repeated obligations. FACTUAL ONLY. Use phrasing like "The tender specifies..." or "The contractor is obligated to...". Do NOT use "should" or "may be risky".'
    );
  }

  /**
   * MOCK BART Summarization
   * In production, this would call local BART model via transformers.js or Python API
   * 
   * For Phase 4A implementation, we use rule-based extraction as placeholder
   */
  private async mockBARTSummarize(text: string, instruction: string): Promise<string> {
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Rule-based extraction (placeholder for real BART)
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    
    // Extract key sentences based on instruction keywords
    const keywords = this.extractKeywordsFromInstruction(instruction);
    const relevantLines = lines.filter(line => 
      keywords.some(keyword => line.toLowerCase().includes(keyword.toLowerCase()))
    );

    // Take top 5-10 most relevant sentences
    const summary = relevantLines.slice(0, 8).join(' ').substring(0, 500);

    // If no relevant lines found, take first few lines
    if (summary.length === 0) {
      return lines.slice(0, 5).join(' ').substring(0, 500);
    }

    return summary || 'Not explicitly specified in the tender document.';
  }

  /**
   * Extract keywords from instruction for mock summarization
   */
  private extractKeywordsFromInstruction(instruction: string): string[] {
    const keywords: string[] = [];
    
    // Common extraction patterns
    const patterns = [
      /EMD/i,
      /earnest money/i,
      /performance/i,
      /security/i,
      /completion/i,
      /duration/i,
      /period/i,
      /defect/i,
      /liability/i,
      /submission/i,
      /validity/i,
      /date/i,
      /deadline/i,
      /work/i,
      /specification/i,
      /technical/i,
      /bond/i,
      /guarantee/i,
      /authority/i,
      /jurisdiction/i,
      /contract/i,
      /value/i,
      /scope/i,
    ];

    for (const pattern of patterns) {
      if (pattern.test(instruction)) {
        const match = instruction.match(pattern);
        if (match) {
          keywords.push(match[0]);
        }
      }
    }

    return keywords;
  }
}

/**
 * Singleton instance for global use
 */
export const bartSummarizationService = new BARTSummarizationService();
