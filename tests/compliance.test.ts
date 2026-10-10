import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeCompliance,
  analyzeContractTerms,
  calculateOverallRiskLevel,
} from '../features/compliance-scoring/services/complianceScorer';

test('overall risk follows the category levels', () => {
  assert.equal(calculateOverallRiskLevel({ a: 'Low', b: 'Low', c: 'Low', d: 'Low' }), 'Low');
  assert.equal(calculateOverallRiskLevel({ a: 'Medium', b: 'Medium', c: 'Low', d: 'Low' }), 'Medium');
  assert.equal(calculateOverallRiskLevel({ a: 'High', b: 'Low', c: 'Low', d: 'Low' }), 'Medium');
  assert.equal(calculateOverallRiskLevel({ a: 'High', b: 'High', c: 'Low', d: 'Low' }), 'High');
});

test('flags no price variation over a long contract from the quoted terms', () => {
  const summary = {
    executiveSummary: '', commercialTerms: '', datesAndObligations: '', technicalScope: '',
    legalHighlights: '', attentionPoints: '',
    metadata: {
      tenderId: 't', tenderTitle: 't', generatedAt: new Date(), modelUsed: 'm', totalChunks: 1, processingTimeMs: 1,
      completionMonths: 18,
      keyTerms: [
        { label: 'Price variation (Clause 10CC)', text: 'Price variation under Clause 10CC shall not be applicable for this work.' },
        { label: 'Compensation for delay (Clause 2)', text: 'Compensation for delay under Clause 2 shall be levied at 1.5% per month.' },
      ],
    },
  };
  const result = analyzeContractTerms(summary);
  assert.equal(result.level, 'High');
  assert.match(result.risks[0].description, /over the 18-month completion period/);
  assert.equal(result.risks.length, 2);
});

const blankSummary = (metadata: Record<string, unknown>, prose = '') => ({
  executiveSummary: prose, commercialTerms: prose, datesAndObligations: prose, technicalScope: prose,
  legalHighlights: prose, attentionPoints: prose,
  metadata: { tenderId: 't', tenderTitle: 't', generatedAt: new Date(), modelUsed: 'm', totalChunks: 1, processingTimeMs: 1, ...metadata },
});

test('model prose alone raises no risk: EMD, "specific", "multiple" and no "extension" word', async () => {
  const prose = 'EMD of Rs. 29,64,000. Specific and multiple works over 23 months. Online portal. Arbitration. Guarantee.';
  const { score } = await analyzeCompliance({ summary: blankSummary({ riskClauses: [] }, prose) });
  assert.equal(score.identifiedRisks.length, 0);
  assert.equal(score.submissionTraps.length, 0);
  assert.equal(score.complianceScore, 80);
  assert.equal(score.riskLevel, 'Low');
});

test('risks quote the tender, and quoted "should" does not fail the language check', async () => {
  const riskClauses = [
    { label: 'Unconditional guarantee', text: 'The bidder should furnish an unconditional bank guarantee of 5%.' },
    { label: 'Final and binding', text: 'The decision of the Engineer-in-Charge shall be final and binding.' },
    { label: 'Online submission', text: 'Bids shall be submitted online on the CPWD e-tendering portal.' },
    { label: 'Dispute resolution', text: 'Disputes shall be settled by arbitration at New Delhi.' },
  ];
  const { score } = await analyzeCompliance({ summary: blankSummary({ riskClauses, completionMonths: 18 }) });
  assert.deepEqual(score.identifiedRisks.map(r => r.sourceSection), ['tender text', 'tender text']);
  assert.match(score.identifiedRisks[0].description, /unconditional bank guarantee of 5%/);
  assert.equal(score.submissionTraps.length, 2);
  assert.deepEqual(score.missingOrWeakClauses.map(c => c.clause), ['Time Extension Provisions', 'Force Majeure Clause']);
});

test('arbitration excluded and a 30-month period are flagged', async () => {
  const riskClauses = [{ label: 'Dispute resolution', text: 'Arbitration shall not be applicable to this contract.' }];
  const { score } = await analyzeCompliance({ summary: blankSummary({ riskClauses, completionMonths: 30 }) });
  assert.equal(score.riskCategories.legal, 'Medium');
  assert.equal(score.riskCategories.technical, 'Medium');
});

test('older reports without quoted clauses report no missing clauses', async () => {
  const { score } = await analyzeCompliance({ summary: blankSummary({}) });
  assert.equal(score.missingOrWeakClauses.length, 0);
});
