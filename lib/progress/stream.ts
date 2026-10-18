/**
 * NDJSON progress streaming (see events.ts for the wire format).
 * streamProgress runs on the server, readProgressStream in the browser, trackStep in the pipelines.
 */

import type { OnProgress, ProgressEvent, StepId, StreamLine } from './events';

/** Emits started, then done (with an optional detail) or failed around one pipeline step. */
export async function trackStep<T>(
  onProgress: OnProgress | undefined,
  step: StepId,
  label: string,
  run: () => T | Promise<T>,
  detail?: (result: T) => string | undefined
): Promise<T> {
  onProgress?.({ step, status: 'started', label });
  try {
    const result = await run();
    const line = detail?.(result);
    onProgress?.({ step, status: 'done', label, ...(line ? { detail: line } : {}) });
    return result;
  } catch (error) {
    onProgress?.({ step, status: 'failed', label });
    throw error;
  }
}

/**
 * Runs `job` and streams its progress as NDJSON, then one result or error line.
 * `toError` maps a thrown error to what the user may see; internal messages must not leak through it.
 */
export function streamProgress<T>(
  job: (onProgress: OnProgress) => Promise<T>,
  toError: (error: unknown) => { error: string; status: number }
): Response {
  const encoder = new TextEncoder();
  const start = Date.now();
  let open = true;

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const write = (line: StreamLine<T>) => {
        if (!open) return;
        try {
          controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
        } catch {
          open = false; // client went away; the job still finishes
        }
      };
      try {
        const data = await job(update => write({ ...update, type: 'progress', at: Date.now() - start }));
        write({ type: 'result', data });
      } catch (error) {
        write({ type: 'error', ...toError(error) });
      }
      if (open) controller.close();
    },
    cancel() {
      open = false;
    },
  });

  return new Response(body, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      'x-accel-buffering': 'no',
    },
  });
}

/**
 * Reads a progress stream, calling onEvent for each progress line, and resolves with the result.
 * Throws Error(message) on an error line, or on a non-OK response with a JSON error body.
 */
export async function readProgressStream<T>(response: Response, onEvent: (event: ProgressEvent) => void): Promise<T> {
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.details || data.error || `Request failed (${response.status}).`);
  }
  if (!response.body) throw new Error('The server sent no response.');

  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (value) buffer += value;
    const lines = buffer.split('\n');
    buffer = done ? '' : lines.pop()!;
    for (const raw of lines) {
      if (!raw.trim()) continue;
      const line = JSON.parse(raw) as StreamLine<T>;
      if (line.type === 'progress') onEvent(line);
      else if (line.type === 'result') return line.data;
      else throw new Error(line.error);
    }
    if (done) throw new Error('The connection closed before the result arrived.');
  }
}
