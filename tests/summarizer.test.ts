import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findCompletionMonths, findNitReference } from '../features/summarization/services/summarizer';

test('finds the NIT reference as printed', () => {
  assert.equal(findNitReference('CPWD\nNIT No. 14/EE/PCD-II/2026-27 for construction of'), '14/EE/PCD-II/2026-27');
  assert.equal(findNitReference('N.I.T. No: 05/SE/2025-26.'), '05/SE/2025-26');
  assert.equal(findNitReference('e-Tender No. PWD-MH/2026/112 dated'), 'PWD-MH/2026/112');
  assert.equal(
    findNitReference('NOTICE INVITING e-TENDER (NIT) No. 14/EE/PCD-II/2026-27'),
    '14/EE/PCD-II/2026-27'
  );
});

test('returns undefined when no reference is present', () => {
  assert.equal(findNitReference('Public Works Department invites bids for road works.'), undefined);
});

test('finds the completion period in months', () => {
  assert.equal(findCompletionMonths('Period of completion: 18 (Eighteen) months including monsoon'), 18);
  assert.equal(findCompletionMonths('Time allowed for completion of work 12 months'), 12);
  assert.equal(findCompletionMonths('Completion period 18 months including monsoon.'), 18);
  assert.equal(findCompletionMonths('No period here'), undefined);
});
