import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readProgressStream, streamProgress } from '../lib/progress/stream';
import { ANALYSIS_STEPS, type ProgressEvent, type ProgressUpdate } from '../lib/progress/events';
import { executeIntelligencePipeline } from '../features/intelligence-orchestrator';
import { generateFoundationBid } from '../features/bid-generation/services/foundationBidGenerator';
import { sampleProfile } from '../lib/company/sample';

/** A Response whose body arrives in the given pieces. */
const chunked = (pieces: string[], init?: ResponseInit) =>
  new Response(
    new ReadableStream({
      start(c) {
        pieces.forEach(p => c.enqueue(new TextEncoder().encode(p)));
        c.close();
      },
    }),
    init
  );

test('stream round trip: progress lines then the result', async () => {
  const response = streamProgress(
    async onProgress => {
      onProgress({ step: 'extract', status: 'started', label: 'Text extraction' });
      onProgress({ step: 'extract', status: 'done', detail: '10 words read' });
      return { ok: 1 };
    },
    () => ({ error: 'x', status: 500 })
  );
  assert.equal(response.headers.get('content-type'), 'application/x-ndjson; charset=utf-8');
  assert.equal(response.headers.get('cache-control'), 'no-cache, no-transform');
  assert.equal(response.headers.get('x-accel-buffering'), 'no');

  const events: ProgressEvent[] = [];
  const data = await readProgressStream<{ ok: number }>(response, e => events.push(e));
  assert.deepEqual(data, { ok: 1 });
  assert.deepEqual(
    events.map(({ type, step, status }) => [type, step, status]),
    [
      ['progress', 'extract', 'started'],
      ['progress', 'extract', 'done'],
    ]
  );
  assert.equal(events[1].detail, '10 words read');
  assert.ok(events.every(e => typeof e.at === 'number' && e.at >= 0));
});

test('reader handles lines split across chunks', async () => {
  const lines = [
    { type: 'progress', step: 'dates', status: 'started', at: 1 },
    { type: 'progress', step: 'dates', status: 'done', detail: 'Completion period: 18 months', at: 2 },
    { type: 'result', data: { text: 'héllo ₹' } },
  ]
    .map(l => JSON.stringify(l) + '\n')
    .join('');
  const bytes = new TextEncoder().encode(lines);
  // Split every 7 bytes so lines and multi-byte characters straddle chunks.
  const response = new Response(
    new ReadableStream({
      start(c) {
        for (let i = 0; i < bytes.length; i += 7) c.enqueue(bytes.slice(i, i + 7));
        c.close();
      },
    })
  );
  const events: ProgressEvent[] = [];
  assert.deepEqual(await readProgressStream(response, e => events.push(e)), { text: 'héllo ₹' });
  assert.deepEqual(events.map(e => e.status), ['started', 'done']);
});

test('an error line or a failed job becomes a thrown Error with the mapped message', async () => {
  await assert.rejects(
    readProgressStream(chunked(['{"type":"progress","step":"legal","status":"started","at":0}\n{"type":"error","error":"Nope","status":422}\n']), () => {}),
    { message: 'Nope' }
  );
  const response = streamProgress(
    async () => {
      throw new Error('internal secret');
    },
    () => ({ error: 'Failed to process tender document. Please try again.', status: 500 })
  );
  const text = await response.text();
  assert.doesNotMatch(text, /secret/);
  assert.deepEqual(JSON.parse(text.trim()), { type: 'error', error: 'Failed to process tender document. Please try again.', status: 500 });
});

test('a non-OK JSON response throws its error', async () => {
  const response = Response.json({ error: 'No file provided.' }, { status: 400 });
  await assert.rejects(readProgressStream(response, () => {}), { message: 'No file provided.' });
  await assert.rejects(readProgressStream(chunked(['{"type":"progress","step":"legal","status":"started","at":0}\n']), () => {}), /closed before/);
});

const TENDER = [
  'NOTICE INVITING TENDER',
  'NIT No: 50/Civil/D1/2026-27',
  'Name of work: Construction of hostel block including RCC frame, masonry and finishes',
  'Estimated cost put to tender: Rs. 1,56,48,695/-',
  'Earnest Money Deposit (Rs.) : Rs. 3,12,974/-',
  'Period of completion: 18 (Eighteen) months',
  'Compensation for delay (Clause 2): 1.5% per month, maximum 10%.',
  'Eligibility: three similar works of Rs. 62.59 lakh each in the last seven years.',
].join('\n');

/** Stands in for Ollama: `reply(prompt, n)` answers the nth generate call. */
function stubOllama(reply: (prompt: string, n: number) => string) {
  const real = globalThis.fetch;
  let n = 0;
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    if (String(url).endsWith('/api/tags')) {
      return Response.json({ models: [{ name: 'llama3:latest' }, { name: 'qwen2.5:3b-instruct' }] });
    }
    const { prompt, model } = JSON.parse(String(init?.body));
    return Response.json({ model, response: reply(prompt, n++), done: true, eval_count: 1 });
  }) as typeof fetch;
  return () => {
    globalThis.fetch = real;
  };
}

async function analyse(onProgress: (u: ProgressUpdate) => void) {
  const file = join(mkdtempSync(join(tmpdir(), 'progress-test-')), 'nit.txt');
  writeFileSync(file, TENDER);
  return executeIntelligencePipeline({ tenderFilePath: file, tenderId: 'T-1', tenderTitle: 'Hostel', onProgress });
}

test('the analysis pipeline reports every step in order', async () => {
  const restore = stubOllama(() => '- The tender asks for an EMD of Rs. 3,12,974.');
  try {
    const updates: ProgressUpdate[] = [];
    await analyse(u => updates.push(u));
    assert.deepEqual(
      updates.map(u => `${u.step}:${u.status}`),
      ANALYSIS_STEPS.flatMap(step => [`${step}:started`, `${step}:done`])
    );
    const detail = (step: string) => updates.find(u => u.step === step && u.status === 'done')?.detail;
    assert.equal(detail('model-check'), 'Local model ready');
    assert.equal(detail('commercial-terms'), 'EMD: Rs. 3,12,974');
    assert.equal(detail('dates'), 'Completion period: 18 months');
    assert.match(detail('compliance') ?? '', /^Risk level: (Low|Medium|High), score \d+\/100$/);
    assert.ok(updates.every(u => u.label));
  } finally {
    restore();
  }
});

test('the bid reports each section, retries and withheld drafts', async () => {
  let restore = stubOllama(() => '- Summary line.');
  const { report } = await analyse(() => {}).finally(() => restore());
  const invented = 'Our company has completed similar works in the past, meeting the eligibility criteria.';
  // Every model draft is rejected twice: each model section retries once, then is withheld.
  restore = stubOllama(() => invented);
  try {
    const updates: ProgressUpdate[] = [];
    const bid = await generateFoundationBid(report, sampleProfile(), u => updates.push(u));
    assert.deepEqual(updates.slice(0, 2).map(u => `${u.step}:${u.status}`), ['model-check:started', 'model-check:done']);
    const bySection = new Map<string, string[]>();
    for (const u of updates.slice(2)) bySection.set(u.step, [...(bySection.get(u.step) ?? []), u.status]);
    assert.deepEqual([...bySection.keys()], bid.sections.map(s => `section:${s.id}`));
    for (const s of bid.sections) {
      const expected = s.source === 'model' ? ['started', 'retry', 'withheld'] : ['started', 'done'];
      assert.deepEqual(bySection.get(`section:${s.id}`), expected, s.id);
    }
    assert.ok(bid.sections.some(s => s.source === 'model'));
    assert.ok(updates.slice(2).every(u => u.label === bid.sections.find(s => `section:${s.id}` === u.step)!.title));
  } finally {
    restore();
  }

  // A model that is down fails the model check.
  const real = globalThis.fetch;
  globalThis.fetch = (async () => Response.json({ models: [] })) as unknown as typeof fetch;
  try {
    const updates: ProgressUpdate[] = [];
    await assert.rejects(generateFoundationBid(report, sampleProfile(), u => updates.push(u)), /not available/);
    assert.deepEqual(updates.map(u => `${u.step}:${u.status}`), ['model-check:started', 'model-check:failed']);
  } finally {
    globalThis.fetch = real;
  }
});
