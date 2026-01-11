/**
 * Internal Test Utilities for AI Generation
 * 
 * INTERNAL USE ONLY - NOT EXPOSED TO UI
 * 
 * These functions are for validating LLM integration during development.
 */

import { generateWithLlm, checkLlmHealth } from './localLlmService';
import { GLOBAL_SYSTEM_PROMPT } from './generationInstruction';
import type { LlmGenerationResponse } from '../types/aiGeneration.types';

/**
 * Deterministic test prompt for infrastructure generation
 */
const TEST_USER_PROMPT = `Generate a short formal paragraph (approximately 100 words) describing a public infrastructure project for road widening in an urban area. Include project scope, expected duration, and compliance requirements. Use formal government tender language.`;

/**
 * Test result with diagnostic information
 */
export interface TestGenerationResult {
  success: boolean;
  response?: LlmGenerationResponse;
  error?: string;
  healthCheck?: {
    available: boolean;
    modelName?: string;
    version?: string;
    errorMessage?: string;
  };
}

/**
 * Run a deterministic test generation
 * 
 * INTERNAL ONLY - This function tests:
 * - LLM service availability
 * - Request/response flow
 * - Response timing
 * - Token counting
 * 
 * @returns Test result with diagnostics
 */
export async function runInternalGenerationTest(): Promise<TestGenerationResult> {
  console.log('🧪 Running internal AI generation test...');
  
  try {
    // Step 1: Health check
    console.log('1️⃣ Checking LLM health...');
    const healthCheck = await checkLlmHealth();
    
    if (!healthCheck.available) {
      console.error('❌ Health check failed:', healthCheck.errorMessage);
      return {
        success: false,
        error: `LLM not available: ${healthCheck.errorMessage}`,
        healthCheck,
      };
    }
    
    console.log(`✅ LLM available: ${healthCheck.modelName} (${healthCheck.version})`);
    
    // Step 2: Test generation
    console.log('2️⃣ Running test generation...');
    const startTime = Date.now();
    
    const response = await generateWithLlm({
      systemPrompt: GLOBAL_SYSTEM_PROMPT,
      userPrompt: TEST_USER_PROMPT,
      inferenceOptions: {
        temperature: 0.2,
        max_tokens: 512,
      },
    });
    
    const totalTime = Date.now() - startTime;
    
    console.log('✅ Generation complete');
    console.log(`⏱️  Response time: ${response.responseTimeMs}ms (total: ${totalTime}ms)`);
    console.log(`🔢 Token count: ${response.tokenCount || 'N/A'}`);
    console.log(`🤖 Model: ${response.modelName}`);
    console.log(`📝 Content length: ${response.content.length} characters`);
    console.log(`🏁 Finish reason: ${response.finishReason}`);
    console.log('\n--- Generated Content ---');
    console.log(response.content);
    console.log('--- End of Content ---\n');
    
    return {
      success: true,
      response,
      healthCheck,
    };
  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Quick health check utility (minimal output)
 */
export async function quickHealthCheck(): Promise<boolean> {
  const health = await checkLlmHealth();
  if (health.available) {
    console.log(`✅ LLM Ready: ${health.modelName}`);
    return true;
  } else {
    console.error(`❌ LLM Not Available: ${health.errorMessage}`);
    return false;
  }
}

/**
 * Get diagnostic summary
 */
export async function getDiagnosticSummary(): Promise<string> {
  const health = await checkLlmHealth();
  
  if (!health.available) {
    return `❌ LLM NOT AVAILABLE
Reason: ${health.errorMessage}

Ensure Ollama is running:
  ollama serve

Ensure model is pulled:
  ollama pull llama3:8b-instruct`;
  }
  
  return `✅ LLM AVAILABLE
Model: ${health.modelName}
Version: ${health.version}
Status: Ready for generation

To test generation, run:
  runInternalGenerationTest()`;
}
