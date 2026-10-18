import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clauseRegister } from '../components/analysis/clauses';
import { findRiskClauses } from '../features/summarization/services/summarizer';

const metadata = (extra: object) => ({ tenderId: 't', tenderTitle: 't', generatedAt: new Date(), modelUsed: 'm', totalChunks: 1, processingTimeMs: 1, ...extra });

test('the clause register quotes what was found and lists the rest as not found', () => {
  const register = clauseRegister(
    metadata({
      keyTerms: [{ label: 'Performance guarantee', text: 'Performance Guarantee : 5% of tendered value.' }],
      riskClauses: [{ label: 'Final and binding', text: 'The decision of Engineer-in-Charge shall be final and binding.' }],
    })
  )!;
  assert.equal(register.find(c => c.label === 'Performance guarantee')?.quote, 'Performance Guarantee : 5% of tendered value.');
  assert.equal(register.find(c => c.label === 'Final and binding')?.group, 'Legal');
  assert.equal(register.find(c => c.label === 'Indemnity')?.quote, undefined);
  assert.equal(clauseRegister(metadata({})), null);
});

test('risk clauses skip contents pages and stop at the next numbered heading', () => {
  const text = [
    'Index 1 Instructions for bidders for e-tendering 3-5 2 CPWD-6 6-11 3 Scope of work 14-15 4 Forms 16-24.',
    'Bids shall be submitted online on the CPPP portal only.',
    'If he does not do so within 3 days of receipt of such notice, the work shall be got done at his cost 4.0 Special Conditions for Steel apply here.',
  ].join('\n');
  const quotes = Object.fromEntries(findRiskClauses(text).map(c => [c.label, c.text]));
  assert.match(quotes['Online submission'], /^Bids shall be submitted online/);
  assert.doesNotMatch(quotes['Short notice'], /Special Conditions/);
});
