#!/usr/bin/env node
/**
 * Stand-in for Ollama when you can't run real models (CI, cloud sandboxes, UI work).
 * Implements the two endpoints the app uses: GET /api/tags and POST /api/generate.
 *
 *   node scripts/mock-ollama.mjs            # listens on :11434
 *   PORT=11500 node scripts/mock-ollama.mjs # then set OLLAMA_BASE_URL=http://localhost:11500
 */

import http from 'node:http';

const PORT = Number(process.env.PORT) || 11434;
const MODELS = (process.env.MOCK_MODELS || 'llama3:latest,qwen2.5:3b-instruct').split(',');

function readBody(req) {
  return new Promise(resolve => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/api/tags') {
    res.end(JSON.stringify({ models: MODELS.map(name => ({ name, details: { parameter_size: 'mock' } })) }));
    return;
  }

  if (req.method === 'POST' && req.url === '/api/generate') {
    const { model, prompt = '' } = JSON.parse((await readBody(req)) || '{}');
    if (!MODELS.includes(model)) {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: `model "${model}" not found` }));
      return;
    }
    const task = prompt.match(/(?:Task: |Write the ")([^\n"]+)/)?.[1] ?? 'request';
    res.end(
      JSON.stringify({
        model,
        created_at: new Date().toISOString(),
        response: `[mock ${model}] Response for: ${task}. (${prompt.length} prompt chars received)`,
        done: true,
        eval_count: 42,
      })
    );
    console.log(`[mock-ollama] ${model} → ${task}`);
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ error: 'not found' }));
});

server.listen(PORT, () => console.log(`[mock-ollama] listening on http://localhost:${PORT} with ${MODELS.join(', ')}`));
