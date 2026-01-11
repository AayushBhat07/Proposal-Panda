/**
 * PHASE 4B: Local Instruction Model Service
 * Handles communication with small, fast instruction-following models
 * 
 * Supported models:
 * - Qwen2.5-3B-Instruct (recommended)
 * - Phi-3 Mini (alternative)
 * 
 * Requirements:
 * - Local inference only (via Ollama)
 * - No cloud APIs
 * - No API keys
 * - Deterministic inference (low temperature)
 * 
 * NOT USED:
 * - BART (summarization only)
 * - LLaMA (generation only)
 * - Any generative prose-heavy model
 */

export interface InstructionModelResponse {
  text: string;
  processingTimeMs: number;
  model: string;
}

export interface InstructionModelOptions {
  model: 'qwen2.5:3b-instruct' | 'phi3:mini';
  temperature: number;
  maxTokens?: number;
  verbose?: boolean;
}

/**
 * Call local instruction model via Ollama
 * 
 * @param prompt - System prompt + user query
 * @param options - Model configuration
 * @returns Model response
 */
export async function callInstructionModel(
  prompt: string,
  options: InstructionModelOptions
): Promise<InstructionModelResponse> {
  const startTime = Date.now();

  try {
    // Mock implementation for Phase 4B demo
    // In production, this would call Ollama API
    
    if (options.verbose) {
      console.log(`[InstructionModel] Using model: ${options.model}`);
      console.log(`[InstructionModel] Temperature: ${options.temperature}`);
    }

    // Simulate local inference with deterministic mock
    const response = await mockInstructionModelInference(prompt, options);

    const processingTimeMs = Date.now() - startTime;

    if (options.verbose) {
      console.log(`[InstructionModel] Processing time: ${processingTimeMs}ms`);
    }

    return {
      text: response,
      processingTimeMs,
      model: options.model,
    };
  } catch (error) {
    throw new Error(
      `Instruction model inference failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Mock instruction model inference
 * 
 * In production, this would be replaced with actual Ollama API call:
 * 
 * ```typescript
 * const response = await fetch('http://localhost:11434/api/generate', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     model: options.model,
 *     prompt: prompt,
 *     temperature: options.temperature,
 *     max_tokens: options.maxTokens || 2048,
 *   }),
 * });
 * ```
 * 
 * For demo purposes, we use rule-based analysis that mimics what a small
 * instruction model would produce.
 */
async function mockInstructionModelInference(
  prompt: string,
  options: InstructionModelOptions
): Promise<string> {
  // Simulate network latency
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Extract key information from prompt for deterministic analysis
  const promptLower = prompt.toLowerCase();

  // Rule-based risk identification
  const risks: string[] = [];
  let complianceScore = 80; // Start with baseline

  // Financial risk indicators
  if (
    promptLower.includes('emd') ||
    promptLower.includes('earnest money') ||
    promptLower.includes('security deposit')
  ) {
    risks.push('Financial:High EMD requirement detected');
    complianceScore -= 5;
  }

  if (
    promptLower.includes('unconditional') &&
    (promptLower.includes('guarantee') || promptLower.includes('bond'))
  ) {
    risks.push('Financial:Unconditional guarantee required');
    complianceScore -= 10;
  }

  if (
    promptLower.includes('forfeiture') ||
    promptLower.includes('penalty')
  ) {
    risks.push('Financial:Forfeiture clauses present');
    complianceScore -= 5;
  }

  // Technical risk indicators
  if (
    promptLower.includes('complex') ||
    promptLower.includes('extensive') ||
    promptLower.includes('multiple')
  ) {
    risks.push('Technical:Extensive scope of work');
    complianceScore -= 5;
  }

  if (
    promptLower.includes('23 months') ||
    promptLower.includes('long duration') ||
    promptLower.includes('extended period')
  ) {
    risks.push('Technical:Long execution period');
    complianceScore -= 3;
  }

  // Legal risk indicators
  if (
    promptLower.includes('finality') ||
    promptLower.includes('binding') ||
    promptLower.includes('irrevocable')
  ) {
    risks.push('Legal:Finality clauses present');
    complianceScore -= 10;
  }

  if (
    promptLower.includes('jurisdiction') ||
    promptLower.includes('arbitration')
  ) {
    risks.push('Legal:Specific jurisdiction requirements');
    complianceScore -= 3;
  }

  // Submission risk indicators
  if (
    promptLower.includes('3 days') ||
    promptLower.includes('72 hours') ||
    promptLower.includes('short notice')
  ) {
    risks.push('Submission:Short submission timeline');
    complianceScore -= 8;
  }

  if (
    promptLower.includes('online portal') ||
    promptLower.includes('digital signature')
  ) {
    risks.push('Submission:Online submission requirements');
    complianceScore -= 2;
  }

  // Determine overall risk level
  let riskLevel: 'Low' | 'Medium' | 'High';
  if (complianceScore >= 75) {
    riskLevel = 'Low';
  } else if (complianceScore >= 60) {
    riskLevel = 'Medium';
  } else {
    riskLevel = 'High';
  }

  // Build structured JSON response
  const response = {
    analysis: {
      complianceScore: Math.max(0, Math.min(100, complianceScore)),
      riskLevel,
      identifiedRisks: risks,
      confidenceLevel: 'High (deterministic analysis)',
      modelReasoning:
        'Analysis based on factual extraction from tender summary sections.',
    },
  };

  return JSON.stringify(response, null, 2);
}

/**
 * Validate instruction model availability
 * 
 * Checks if the specified model is available via Ollama
 */
export async function validateInstructionModel(
  model: 'qwen2.5:3b-instruct' | 'phi3:mini'
): Promise<boolean> {
  try {
    // Mock validation - always return true for demo
    // In production, this would check Ollama model list:
    // const response = await fetch('http://localhost:11434/api/tags');
    // const data = await response.json();
    // return data.models.some((m: any) => m.name === model);

    console.log(`[InstructionModel] Model ${model} validated (mock)`);
    return true;
  } catch (error) {
    console.error(`[InstructionModel] Validation failed:`, error);
    return false;
  }
}

/**
 * Get recommended instruction model based on system capabilities
 */
export function getRecommendedModel(): 'qwen2.5:3b-instruct' | 'phi3:mini' {
  // For demo, always recommend Qwen2.5-3B
  // In production, this could check system resources
  return 'qwen2.5:3b-instruct';
}
