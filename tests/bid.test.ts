import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDraftProblem, renderProgramme } from '../features/bid-generation/services/foundationBidGenerator';

const queries = { id: 'pre-bid-queries', title: 'Pre-bid Queries', cover: 'technical' as const, brief: '' };

test('rejects drafts that invent company eligibility facts', () => {
  const invented = [
    'Our average annual financial turnover during the last three consecutive financial years was Rs. 10.11 crore.',
    'Our company has completed similar works in the past, meeting the eligibility criteria.',
    'We confirm that our company has not incurred any loss in more than two years.',
    'We confirm that our company has the necessary technical capabilities.',
  ];
  for (const text of invented) assert.ok(findDraftProblem(queries, `1. ${text}`), text);
});

test('accepts drafts that only restate tender requirements', () => {
  const ok =
    '1. Average annual turnover of Rs. 7.45 crore is required; supporting documents enclosed at [Annexure __].\n' +
    '2. Please clarify whether Clause 2 compensation is capped at 10%.';
  assert.equal(findDraftProblem(queries, ok), undefined);
});

test('rejects a queries section with no numbered queries', () => {
  assert.match(findDraftProblem({ ...queries, check: c => (/^\s*1[.)]\s/m.test(c) ? undefined : 'none') }, 'BODY OF THE BID') ?? '', /none/);
});

test('programme has one line per month and leaves out defect liability', () => {
  const draft = 'Month 1: Mobilisation\nMonths 2-4: Foundations\nMonth 16-18: Finishing, defect liability period';
  const out = renderProgramme(draft, 18);
  const lines = out.split('\n').filter(l => l.startsWith('Month'));
  assert.equal(lines.length, 18);
  assert.equal(lines[2], 'Month 3: Foundations');
  assert.equal(lines[17], 'Month 18: Finishing');
  assert.equal(lines[5], 'Month 6: [activities to be planned]');
  assert.doesNotMatch(lines.join('\n'), /defect liability/i);
});
