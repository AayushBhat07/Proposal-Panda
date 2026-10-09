import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
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
