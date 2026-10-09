import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findCompletionMonths,
  findEmdAmount,
  findEstimatedCost,
  findNitReference,
  selectSourceText,
} from '../features/summarization/services/summarizer';

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

test('finds EMD and estimated cost as printed', () => {
  const nit = 'Estimated cost put to tender: Rs. 14,90,00,000\nEarnest Money Deposit (EMD): Rs.27,24,900.';
  assert.equal(findEmdAmount(nit), 'Rs. 27,24,900');
  assert.equal(findEstimatedCost(nit), 'Rs. 14,90,00,000');
  assert.equal(findEmdAmount('No deposit is mentioned here'), undefined);
});

test('does not repeat the document head in the source excerpt', () => {
  const head = 'Name of Work:\n\nConstruction  of  hostel. ' + 'x '.repeat(2100);
  const fullText = head + 'Concrete grade M25 specification. ' + 'y '.repeat(500);
  const chunks = [
    { index: 0, text: fullText.split(/\s+/).slice(0, 300).join(' '), tokenCount: 0, source: 'Full Text' },
    { index: 1, text: 'Concrete grade M25 specification. ' + 'y '.repeat(50).trim(), tokenCount: 0, source: 'Full Text' },
  ];
  const excerpt = selectSourceText(fullText, chunks);
  assert.equal(excerpt.split('Name of Work').length - 1, 1);
  assert.match(excerpt, /\.\.\.\nConcrete grade M25/);
});
