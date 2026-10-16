import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bidCapacity, formatLakh, lastFiveYears, parseLakh } from '../lib/company/profile';
import { bidCapacity as bidCapacityProforma, declarations, documentChecklist, pastExperience } from '../features/bid-generation/services/bidTemplates';
import type { CompanyProfile } from '../types/onboarding.types';

const asOf = new Date('2026-10-16');
const company: CompanyProfile = {
  legalName: 'Himgiri Buildcon Private Limited',
  registrationClass: 'Class I (Civil)',
  registeredAddress: 'Parwanoo',
  registrationAuthority: 'CPWD',
  registrationNumber: 'ENL/HP/CIV/2019/0482',
  signatoryName: 'Rajesh Kumar Thakur',
  signatoryDesignation: 'Director',
  turnover: [
    { year: '2025-26', lakh: 6894 },
    { year: '2024-25', lakh: 6127 },
    { year: '2023-24', lakh: 5280 },
    { year: '2022-23', lakh: null },
    { year: '2021-22', lakh: 3842 },
  ],
  worksInHandLakh: 4200,
  similarWorks: [{ name: 'Administrative Block, Sundernagar', client: 'HP PWD', valueLakh: 2208, start: '04/2021', completion: '09/2022' }],
  keyStaff: [{ name: 'A. Sharma', qualification: 'B.E. Civil', years: 14 }],
  machinery: 'Batching plant 30 cum/hr\nTower crane',
};

test('financial years run April to March', () => {
  assert.deepEqual(lastFiveYears(asOf), ['2025-26', '2024-25', '2023-24', '2022-23', '2021-22']);
  assert.deepEqual(lastFiveYears(new Date('2026-02-01')).slice(0, 2), ['2024-25', '2023-24']);
});

test('lakh amounts parse and format the Indian way', () => {
  assert.equal(parseLakh('1,250.5'), 1250.5);
  assert.equal(parseLakh(''), null);
  assert.equal(parseLakh('abc'), null);
  assert.equal(formatLakh(82.5), '₹ 82.50 lakh');
  assert.equal(formatLakh(1564.87), '₹ 1,564.87 lakh (₹ 15.65 crore)');
});

test('bid capacity is 2AN − B with A brought to current prices at 7% simple', () => {
  const result = bidCapacity(company, 15, asOf)!;
  // 2025-26 is one year back: 6894 × 1.07 = 7376.58, beating 6127 × 1.14 = 6984.78
  assert.equal(result.aYear, '2025-26');
  assert.equal(result.a, 7376.58);
  assert.equal(result.n, 1.25);
  assert.equal(result.capacity, Math.round((2 * 7376.58 * 1.25 - 4200) * 100) / 100);
  assert.equal(bidCapacity({ ...company, worksInHandLakh: undefined }, 15, asOf), null);
  assert.equal(bidCapacity(company, undefined, asOf), null);
});

test('proformas use the company file and keep blanks only where it is empty', () => {
  const input = { nitRef: '05/2026-27', tenderTitle: 'Office building', company, kind: 'works' as const, months: 15, asOf };
  const capacity = bidCapacityProforma(input);
  assert.match(capacity, /\*\*A\*\* = ₹ 7,376.58 lakh/);
  assert.match(capacity, /1\. Administrative Block, Sundernagar, HP PWD, ₹ 2,208.00 lakh/);
  assert.match(capacity, /^2\. \[Name of work\]/m);
  assert.match(capacity, /A\. Sharma, B\.E\. Civil, 14 years/);
  assert.match(capacity, /- Tower crane/);
  assert.match(declarations(input), /I, Rajesh Kumar Thakur, Director of Himgiri/);
  assert.match(documentChecklist(input), /CPWD, Class I \(Civil\), No\. ENL\/HP\/CIV\/2019\/0482/);
  assert.match(pastExperience({ ...input, kind: 'supply' }), /- FY 2025-26: ₹ 6,894.00 lakh/);

  const bare = { ...input, company: { legalName: 'X', registrationClass: 'Class II', registeredAddress: 'Y' } };
  assert.match(bidCapacityProforma(bare), /\*\*A\*\* = maximum value/);
  assert.match(declarations(bare), /\[name of authorised signatory\], \[designation\]/);
});
