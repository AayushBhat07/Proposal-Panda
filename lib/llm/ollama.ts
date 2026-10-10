/**
 * Local LLM Service
 * The one Ollama client: Llama 3 for bids (AI_CONFIG.MODEL_NAME), Qwen for analysis (AI_CONFIG.ANALYSIS_MODEL)
 */

import { AI_CONFIG } from '@/lib/config/constants';
import type {
  LlmGenerationRequest,
  LlmGenerationResponse,
  LlmError,
  LlmHealthCheck,
} from './types';

/**
 * Ollama API response structure
 */
interface OllamaGenerateResponse {
  model: string;
  created_at: string;
  response: string;
  done: boolean;
  context?: number[];
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  eval_count?: number;
  eval_duration?: number;
}

/**
 * Custom error class for LLM operations
 */
export class LlmServiceError extends Error {
  constructor(
    public readonly type: LlmError['type'],
    message: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'LlmServiceError';
  }
}

/**
 * Create abort controller with timeout
 */
function createTimeoutController(timeoutMs: number): AbortController {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), timeoutMs).unref?.();
  return controller;
}

/**
 * Check if Ollama service is available and model is loaded
 */
export async function checkLlmHealth(modelName: string = AI_CONFIG.MODEL_NAME): Promise<LlmHealthCheck> {
  try {
    const controller = createTimeoutController(5000); // 5s for health check
    
    const response = await fetch(`${AI_CONFIG.OLLAMA_BASE_URL}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        available: false,
        errorMessage: `Ollama responded with status ${response.status}`,
      };
    }

    const data = await response.json();
    const models = data.models || [];
    // Ollama reports "llama3" as "llama3:latest"
    const wanted = modelName.includes(':') ? modelName : `${modelName}:latest`;
    const targetModel = models.find((m: { name: string }) => m.name === wanted);

    if (!targetModel) {
      return {
        available: false,
        errorMessage: `Model ${modelName} not found. Run \`ollama pull ${modelName}\`. Available models: ${models.map((m: any) => m.name).join(', ')}`,
      };
    }

    return {
      available: true,
      modelName: targetModel.name,
      version: targetModel.details?.parameter_size || 'unknown',
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return {
        available: false,
        errorMessage: 'Ollama health check timed out',
      };
    }

    return {
      available: false,
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Generate text using local LLM with retry logic
 */
export async function generateWithLlm(
  request: LlmGenerationRequest,
  retryCount = 0
): Promise<LlmGenerationResponse> {
  const startTime = Date.now();

  try {
    // Validate request
    if (!request.systemPrompt || !request.userPrompt) {
      throw new LlmServiceError(
        'INVALID_REQUEST',
        'Both systemPrompt and userPrompt are required'
      );
    }

    // Combine system and user prompts
    const fullPrompt = `${request.systemPrompt}\n\n${request.userPrompt}`;

    // Prepare Ollama request payload
    const payload = {
      model: request.model ?? AI_CONFIG.MODEL_NAME,
      prompt: fullPrompt,
      stream: false,
      options: {
        temperature: request.inferenceOptions?.temperature ?? AI_CONFIG.DEFAULT_INFERENCE.temperature,
        top_p: request.inferenceOptions?.top_p ?? AI_CONFIG.DEFAULT_INFERENCE.top_p,
        repeat_penalty: request.inferenceOptions?.repeat_penalty ?? AI_CONFIG.DEFAULT_INFERENCE.repeat_penalty,
        num_predict: request.inferenceOptions?.max_tokens ?? AI_CONFIG.DEFAULT_INFERENCE.max_tokens,
        num_ctx: AI_CONFIG.CONTEXT_TOKENS,
      },
    };

    // Create timeout controller
    const controller = createTimeoutController(AI_CONFIG.TIMEOUT_MS);

    // Make request to Ollama
    const response = await fetch(`${AI_CONFIG.OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new LlmServiceError(
        'GENERATION_FAILED',
        `Ollama responded with status ${response.status}: ${response.statusText}`
      );
    }

    const data: OllamaGenerateResponse = await response.json();

    if (!data.done) {
      throw new LlmServiceError(
        'GENERATION_FAILED',
        'Generation was not completed'
      );
    }

    const responseTimeMs = Date.now() - startTime;

    return {
      content: data.response.trim(),
      modelName: data.model,
      tokenCount: data.eval_count,
      responseTimeMs,
      finishReason: data.done ? 'complete' : 'incomplete',
    };
  } catch (error) {
    const responseTimeMs = Date.now() - startTime;

    // Handle timeout
    if (error instanceof Error && error.name === 'AbortError') {
      throw new LlmServiceError(
        'TIMEOUT',
        `Generation timed out after ${AI_CONFIG.TIMEOUT_MS}ms`
      );
    }

    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      // Retry on network error if retries available
      if (retryCount < AI_CONFIG.MAX_RETRIES) {
        console.warn(`Network error, retrying (${retryCount + 1}/${AI_CONFIG.MAX_RETRIES})...`);
        return generateWithLlm(request, retryCount + 1);
      }

      throw new LlmServiceError(
        'OLLAMA_UNAVAILABLE',
        'Ollama service is not available. Ensure it is running at ' + AI_CONFIG.OLLAMA_BASE_URL,
        error as Error
      );
    }

    // Re-throw LlmServiceError
    if (error instanceof LlmServiceError) {
      throw error;
    }

    // Wrap unknown errors
    throw new LlmServiceError(
      'GENERATION_FAILED',
      error instanceof Error ? error.message : 'Unknown generation error',
      error as Error
    );
  }
}

/**
 * Safe wrapper that returns error instead of throwing
 */
export async function generateWithLlmSafe(
  request: LlmGenerationRequest
): Promise<{ success: true; data: LlmGenerationResponse } | { success: false; error: LlmError }> {
  try {
    const data = await generateWithLlm(request);
    return { success: true, data };
  } catch (error) {
    if (error instanceof LlmServiceError) {
      return {
        success: false,
        error: {
          type: error.type,
          message: error.message,
          originalError: error.originalError,
        },
      };
    }

    return {
      success: false,
      error: {
        type: 'GENERATION_FAILED',
        message: error instanceof Error ? error.message : 'Unknown error',
        originalError: error as Error,
      },
    };
  }
}
