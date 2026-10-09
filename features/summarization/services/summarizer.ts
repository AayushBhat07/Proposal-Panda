/**
 * PHASE 4A: Tender summarization service
 * Each summary section is produced by the local analysis model through Ollama
 * (AI_CONFIG.ANALYSIS_MODEL). If Ollama is unreachable, a keyword-based extractive
 * fallback runs instead and metadata.modelUsed says so.
 */

import { AI_CONFIG } from '@/lib/config/constants';
import { checkLlmHealth, generateWithLlmSafe } from '@/lib/llm/ollama';
import type {
  TenderDocumentInput,
  TenderSummary,
  SummarizationOptions,
  SummarizationResult,
  TextChunk,
} from '../types/summarization.types';

/** How much raw tender text the report keeps for bid drafting (~2.5k tokens; Llama 3 has an 8k context). */
const SOURCE_TEXT_CHARS = 10000;

/** Finds the NIT / tender reference, e.g. "NIT No. 14/EE/PCD-II/2026-27". */
export function findNitReference(text: string): string | undefined {
  const match = text.match(
    /\b(?:N\.?I\.?T\.?|(?:e-)?Tender|Bid)\)?\s*(?:No|Number|Ref(?:erence)?)\.?\s*[:\-–]?\s*([A-Z0-9][A-Z0-9/\-.()]*\d[A-Z0-9/\-.()]*)/i
  );
  return match?.[1].replace(/[.)]+$/, '');
}

/** Finds the completion period in months, e.g. "Period of completion: 18 (Eighteen) months". */
export function findCompletionMonths(text: string): number | undefined {
  const match = text.match(
    /(?:period of completion|completion period|time allowed(?: for completion)?|time of completion|to be completed (?:with)?in)[^0-9]{0,40}?(\d{1,2})\s*(?:\([a-z ]+\)\s*)?months/i
  );
  return match ? Number(match[1]) : undefined;
}

/** Finds a rupee figure after a label, e.g. "Earnest Money: Rs. 27,24,900" -> "Rs. 27,24,900". */
function findRupees(text: string, label: RegExp): string | undefined {
  const match = text.match(
    new RegExp(`${label.source}[^0-9\\n]{0,40}?(?:Rs\\.?|₹|INR)\\s*([\\d,]+(?:\\.\\d+)?(?:\\s*(?:lakhs?|crores?))?)`, 'i')
  );
  return match ? `Rs. ${match[1].replace(/[,.]+$/, '')}` : undefined;
}

export const findEmdAmount = (text: string) => findRupees(text, /(?:earnest money(?: deposit)?|\bEMD\b)/);
export const findEstimatedCost = (text: string) => findRupees(text, /estimated cost(?: put to tender)?/);

const SOURCE_HEAD_CHARS = 4000;
const SPEC_KEYWORDS = ['specification', 'grade', 'm20', 'm25', 'm30', 'fe500', 'fe 500', 'is:', 'is ', 'morth',
  'cpwd spec', 'rmc', 'griha', 'quality', 'testing', 'technical staff', 'plant', 'machinery'];

/** NIT head (key data) plus the chunks most about specs and resources, capped for Llama 3's 8k context. */
export function selectSourceText(fullText: string, chunks: TextChunk[]): string {
  let text = fullText.slice(0, SOURCE_HEAD_CHARS);
  // Chunks are rebuilt with single spaces, so locate them in a whitespace-collapsed copy.
  const flat = fullText.replace(/\s+/g, ' ');
  const headEnd = text.replace(/\s+/g, ' ').length;
  for (const chunk of chunks) {
    if (text.length >= SOURCE_TEXT_CHARS) break;
    const lower = chunk.text.toLowerCase();
    const position = flat.indexOf(chunk.text.slice(0, 200));
    if (position !== -1 && position < headEnd) continue; // starts inside the head
    if (SPEC_KEYWORDS.some(k => lower.includes(k))) text += `\n...\n${chunk.text}`;
  }
  return text.slice(0, SOURCE_TEXT_CHARS);
}

/**
 * Tender summarization service (local Qwen model via Ollama)
 *
 * RULES:
 * - Faithful summarization only
 * - No hallucination
 * - No interpretation
 * - No judgment
 * - No scoring
 */
export class TenderSummarizationService {
  private model: string;
  private useLocalModel = false;
  private fallbackSections = 0;
  private maxTokensPerChunk: number;
  private overlapTokens: number;

  constructor(options: SummarizationOptions = {}) {
    this.model = options.model || AI_CONFIG.ANALYSIS_MODEL;
    this.maxTokensPerChunk = options.maxTokensPerChunk || 1024;
    this.overlapTokens = options.overlapTokens || 100;
  }

  /**
   * Summarize tender document
   * Main entry point for summarization
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

      // Step 2: Check the local model once, then generate each section.
      // Sequential on purpose: a local Ollama serves one request at a time.
      const health = await checkLlmHealth(this.model);
      this.useLocalModel = health.available;
      this.fallbackSections = 0;
      if (!health.available) {
        diagnostics.warnings.push(
          `Local model unavailable (${health.errorMessage}); used extractive fallback summaries`
        );
      }

      const executiveSummary = await this.generateExecutiveSummary(chunks);
      const commercialTerms = await this.generateCommercialTerms(chunks);
      const datesAndObligations = await this.generateDatesAndObligations(chunks);
      const technicalScope = await this.generateTechnicalScope(chunks);
      const legalHighlights = await this.generateLegalHighlights(chunks);
      const attentionPoints = await this.generateAttentionPoints(chunks);
      const eligibilityAndClauses = await this.generateEligibilityAndClauses(chunks);

      const processingTimeMs = Date.now() - startTime;
      diagnostics.processingTimeMs = processingTimeMs;

      const summary: TenderSummary = {
        executiveSummary,
        commercialTerms,
        datesAndObligations,
        technicalScope,
        legalHighlights,
        attentionPoints,
        eligibilityAndClauses,
        sourceText: selectSourceText(input.fullText, chunks),
        metadata: {
          tenderId: input.tenderId,
          tenderTitle: input.tenderTitle,
          generatedAt: new Date(),
          nitReference: findNitReference(input.fullText),
          completionMonths: findCompletionMonths(input.fullText),
          emdAmount: findEmdAmount(input.fullText),
          estimatedCost: findEstimatedCost(input.fullText),
          modelUsed: !this.useLocalModel
            ? 'extractive-fallback'
            : this.fallbackSections > 0
              ? `${this.model} (+${this.fallbackSections} extractive)`
              : this.model,
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
   * Chunk text so each model call stays inside the context window
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

    return await this.summarize(
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

    return await this.summarize(
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

    return await this.summarize(
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

    return await this.summarize(
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

    return await this.summarize(
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

    return await this.summarize(
      allText,
      'Extract: long execution periods, high security requirements, extensive technical scope, any repeated obligations. FACTUAL ONLY. Use phrasing like "The tender specifies..." or "The contractor is obligated to...". Do NOT use "should" or "may be risky".'
    );
  }

  /**
   * Eligibility criteria and the contract clauses that decide whether and how to bid.
   */
  private async generateEligibilityAndClauses(chunks: TextChunk[]): Promise<string> {
    const keywords = ['eligib', 'similar work', 'turnover', 'solvency', 'bid capacity', 'compensation', 'delay',
      'penalty', '10cc', 'price variation', 'escalation', 'advance', 'arbitration', 'dispute'];
    const relevantChunks = chunks.filter(c => keywords.some(k => c.text.toLowerCase().includes(k))).slice(0, 6);
    const combinedText = (relevantChunks.length > 0 ? relevantChunks : chunks.slice(0, 5)).map(c => c.text).join('\n\n');

    return await this.summarize(
      combinedText,
      'Extract as bullet points: eligibility criteria (similar works thresholds, average annual turnover, solvency, bid capacity formula); ' +
        'compensation for delay and its cap; price variation / escalation clause (e.g. 10CC) and whether it applies; ' +
        'mobilisation or secured advance; security deposit and performance guarantee; dispute resolution, arbitration and venue. ' +
        'Quote amounts, percentages and clause numbers exactly as written. For each clause, write "applies" or ' +
        '"does not apply" exactly as the tender states. Do not list documents to upload. Keep it under 200 words.',
      800
    );
  }

  /**
   * Summarize one section with the local model; fall back to extraction on any failure.
   */
  private async summarize(text: string, instruction: string, maxTokens = 600): Promise<string> {
    if (this.useLocalModel) {
      const result = await generateWithLlmSafe({
        model: this.model,
        systemPrompt:
          'You summarise Indian public-works tender documents for a contractor. ' +
          'Only state facts found in the provided text. If something is not in the text, say "Not specified in the tender." ' +
          'Quote every amount, percentage, period, clause number and named specification (e.g. M25, Fe500D, MoRTH) exactly as written. ' +
          'Answer in plain prose or short bullet points, under 250 words, with no preamble.',
        // ~4 chars per token; leave room in the context window for the prompt and answer.
        userPrompt: `Task: ${instruction}\n\nTender text:\n${text.slice(0, (AI_CONFIG.CONTEXT_TOKENS - 1024) * 3)}`,
        inferenceOptions: { temperature: 0.1, max_tokens: maxTokens },
      });
      if (result.success && result.data.content) return result.data.content;
      this.fallbackSections++;
      console.warn(`[Summarization] Local model call failed, using extractive fallback: ${
        result.success ? 'empty response' : result.error.message
      }`);
    }
    return this.extractiveSummary(text, instruction);
  }

  /** Keyword-based extraction used when the local model is unavailable. */
  private extractiveSummary(text: string, instruction: string): string {
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
export const tenderSummarizationService = new TenderSummarizationService();
