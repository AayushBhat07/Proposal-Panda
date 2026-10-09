import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findCompletionMonths,
  findDelayCompensation,
  findInvitingOffice,
  findKeyTerms,
  findEmdAmount,
  findEstimatedCost,
  findNitReference,
  findRiskClauses,
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

test('finds delay compensation and the inviting office', () => {
  assert.equal(
    findDelayCompensation('compensation @ 1.5 % per month of delay, subject to a maximum of 10% of the tendered value'),
    '1.5% per month, maximum 10%'
  );
  assert.equal(
    findInvitingOffice('Office of the Executive Engineer, Pune Central Division-II, Nirman Bhawan, Pune - 411001\nNIT'),
    'Executive Engineer, Pune Central Division-II, Nirman Bhawan, Pune - 411001'
  );
});

test('quotes key contract terms from the tender text', () => {
  const nit = [
    'The Security Deposit shall be collected as per Clause 1A.',
    'Security Deposit @ 2.5% of the tendered value shall be recovered from running bills. It shall be refunded after the defect liability period of 12 months.',
    'Compensation for delay under Clause 2 shall be levied @ 1.5% per month of delay, subject to a maximum of 10% of the tendered value.',
    'Clause 10CC (price variation) shall not be applicable to this work.',
    'Mobilisation advance up to 10% of the tendered value at 10% simple interest against a BG of 110%.',
    'Performance Guarantee of 5% of tendered value within 15 days, extendable by 7 days with late fee of 0.1% per day.',
  ].join('\n');
  const terms = Object.fromEntries(findKeyTerms(nit).map(t => [t.label, t.text]));
  assert.equal(terms['Price variation (Clause 10CC)'], 'Clause 10CC (price variation) shall not be applicable to this work.');
  assert.match(terms['Compensation for delay (Clause 2)'], /^Compensation for delay under Clause 2 .*1\.5% per month.*10%/);
  assert.equal(
    terms['Security deposit'],
    'Security Deposit @ 2.5% of the tendered value shall be recovered from running bills. It shall be refunded after the defect liability period of 12 months.'
  );
  assert.match(terms['Mobilisation advance'], /10% simple interest/);
  assert.match(terms['Performance guarantee'], /7 days/);
});

test('quotes risk clauses from the tender text and skips absent ones', () => {
  const text = [
    'Bids shall be submitted online through the CPWD e-tendering portal.',
    'The performance guarantee shall be an unconditional bank guarantee. The EMD shall be forfeited if the bidder withdraws.',
    'Disputes shall be referred to arbitration under Clause 25.',
  ].join('\n');
  const labels = findRiskClauses(text).map(c => c.label);
  assert.deepEqual(labels, ['Unconditional guarantee', 'Forfeiture', 'Dispute resolution', 'Online submission']);
});
