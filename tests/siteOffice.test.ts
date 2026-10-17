import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProgressEvent, ProgressUpdate } from '../lib/progress/events';
import { CREW_FOR } from '../components/site-office/crew';
import { bubbleText, officeState } from '../components/site-office/state';

const ev = (...updates: ProgressUpdate[]): ProgressEvent[] => updates.map((u, i) => ({ type: 'progress', at: i * 100, ...u }));

test('nothing received: everyone idle, generator off, no progress', () => {
  const s = officeState('analysis', []);
  assert.deepEqual(Object.keys(s.crew), CREW_FOR.analysis);
  assert.ok(Object.values(s.crew).every(c => c.state === 'idle'));
  assert.equal(s.progress, 0);
  assert.equal(s.generator, 'off');
  assert.equal(s.diary.length, 0);
  assert.equal(s.steps.length, 10);
  assert.ok(s.steps.every(r => r.status === 'waiting'));
});

test('analysis maps each status to a crew state and counts progress out of 10', () => {
  const s = officeState(
    'analysis',
    ev(
      { step: 'extract', status: 'started' },
      { step: 'extract', status: 'done', detail: 'Read 42 pages' },
      { step: 'model-check', status: 'started' },
      { step: 'model-check', status: 'done' },
      { step: 'executive-summary', status: 'started' },
      { step: 'commercial-terms', status: 'retry' },
      { step: 'dates', status: 'failed' }
    )
  );
  assert.equal(s.crew.clerk.state, 'done');
  assert.equal(s.crew.electrician.state, 'done');
  assert.equal(s.crew.foreman.state, 'working');
  assert.equal(s.crew.estimator.state, 'redoing');
  assert.equal(s.crew.planner.state, 'failed');
  assert.equal(s.crew.engineer.state, 'idle');
  assert.equal(s.generator, 'running');
  assert.equal(s.progress, 0.3); // extract, model check and the failed dates step are settled
  assert.equal(s.diary[1].text, 'Document clerk: Read 42 pages');
  assert.equal(s.diary[1].tone, 'done');
});

test('a crew member with several steps shows the latest one', () => {
  const s = officeState(
    'analysis',
    ev({ step: 'legal', status: 'started' }, { step: 'legal', status: 'done' }, { step: 'eligibility-clauses', status: 'started' })
  );
  assert.equal(s.crew.contracts.state, 'working');
  assert.equal(s.crew.contracts.finished, 1);
  assert.equal(s.crew.contracts.total, 2);
  assert.equal(s.crew.contracts.current, 'Eligibility and clauses');
  assert.equal(s.diary[0].text, 'Contracts officer started “Legal highlights”.');
});

test('generator follows the model check', () => {
  assert.equal(officeState('bid', ev({ step: 'model-check', status: 'started' })).generator, 'starting');
  assert.equal(officeState('bid', ev({ step: 'model-check', status: 'failed' })).generator, 'failed');
  assert.equal(officeState('bid', ev({ step: 'model-check', status: 'started' }), 'Model offline').generator, 'failed');
});

test('an error that is not the model check leaves the generator alone', () => {
  assert.equal(officeState('analysis', ev({ step: 'extract', status: 'failed' }), 'Unreadable PDF').generator, 'off');
  assert.equal(officeState('bid', [], 'Request failed').generator, 'off');
  const running = ev({ step: 'model-check', status: 'done' }, { step: 'executive-summary', status: 'started' });
  assert.equal(officeState('analysis', running, 'Boom').generator, 'running');
});

test('analysis with the model offline: generator failed, run carries on', () => {
  const s = officeState(
    'analysis',
    ev(
      { step: 'extract', status: 'done' },
      { step: 'model-check', status: 'started' },
      { step: 'model-check', status: 'failed', detail: 'Local model offline; using extractive summaries' },
      { step: 'executive-summary', status: 'started' }
    )
  );
  assert.equal(s.generator, 'failed');
  assert.equal(s.crew.electrician.state, 'failed');
  assert.equal(s.crew.foreman.state, 'working');
  assert.equal(s.progress, 0.2);
  assert.equal(s.diary[2].text, 'Electrician stopped on “Checking the local model”: Local model offline; using extractive summaries');
  assert.equal(s.diary[2].tone, 'fail');
});

test('needs-you persists after the same crew member finishes a later section', () => {
  const s = officeState(
    'bid',
    ev(
      { step: 'section:scope', status: 'withheld', label: 'Scope' },
      { step: 'section:methodology', status: 'started', label: 'Methodology' }
    )
  );
  assert.equal(s.crew.engineer.state, 'working');
  const after = officeState(
    'bid',
    ev(
      { step: 'section:scope', status: 'withheld', label: 'Scope' },
      { step: 'section:methodology', status: 'started', label: 'Methodology' },
      { step: 'section:methodology', status: 'done', label: 'Methodology' }
    )
  );
  assert.equal(after.crew.engineer.state, 'needs-you');
  assert.deepEqual(after.crew.engineer.needsEdit, ['Scope']);
});

test('bid progress never goes backwards over a full works bid', () => {
  const ids = ['model-check', ...Array.from({ length: 10 }, (_, i) => `section:s${i}`)] as const;
  const updates: ProgressUpdate[] = ids.flatMap(step => [
    { step, status: 'started' } as ProgressUpdate,
    { step, status: 'done' } as ProgressUpdate,
  ]);
  let prev = 0;
  for (let n = 1; n <= updates.length; n++) {
    const p = officeState('bid', ev(...updates.slice(0, n))).progress;
    assert.ok(p >= prev, `progress fell from ${prev} to ${p} at event ${n}`);
    prev = p;
  }
  assert.equal(prev, 1);
});

test('bid: the Foreman works while any section is in hand, done when all are in', () => {
  assert.equal(officeState('bid', []).crew.foreman.state, 'idle');
  const busy = officeState('bid', ev({ step: 'section:scope', status: 'started', label: 'Scope' }));
  assert.equal(busy.crew.foreman.state, 'working');
  assert.equal(busy.crew.foreman.current, 'Scope');
  assert.equal(officeState('bid', ev({ step: 'section:scope', status: 'done' })).crew.foreman.state, 'done');
  assert.equal(officeState('bid', ev({ step: 'section:scope', status: 'done' }), 'Boom').crew.foreman.state, 'failed');
});

test('bid: withheld section needs you, total estimated from steps seen (at least 11)', () => {
  const s = officeState(
    'bid',
    ev(
      { step: 'model-check', status: 'done' },
      { step: 'section:methodology', status: 'started', label: 'Methodology' },
      { step: 'section:methodology', status: 'withheld', label: 'Methodology', detail: 'the draft was withheld because it read as boilerplate' },
      { step: 'section:letter-of-transmittal', status: 'done', label: 'Letter of transmittal' }
    )
  );
  assert.equal(s.crew.engineer.state, 'needs-you');
  assert.deepEqual(s.crew.engineer.needsEdit, ['Methodology']);
  assert.equal(s.crew.correspondence.state, 'done');
  assert.equal(s.crew.estimator.state, 'idle');
  assert.equal(s.progress, 3 / 11);
  assert.equal(s.steps.length, 3);
  assert.equal(s.diary[2].text, 'Site engineer left “Methodology” for you to edit: the draft was withheld because it read as boilerplate');

  const many = ev(...Array.from({ length: 12 }, (_, i): ProgressUpdate => ({ step: `section:s${i}`, status: 'done' })));
  assert.equal(officeState('bid', many).progress, 1);
});

test('an error stops whoever was still working', () => {
  const s = officeState('analysis', ev({ step: 'extract', status: 'done' }, { step: 'model-check', status: 'started' }), 'Model offline');
  assert.equal(s.crew.clerk.state, 'done');
  assert.equal(s.crew.electrician.state, 'failed');
  assert.equal(s.generator, 'failed');
});

test('bubbles show the working line while busy, else the state word', () => {
  assert.equal(bubbleText('planner', 'working'), 'marking dates');
  assert.equal(bubbleText('planner', 'needs-you'), 'needs your edit');
  assert.equal(bubbleText('planner', 'idle'), 'idle');
});
