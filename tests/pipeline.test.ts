import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkEligibility, eligibilitySummary } from '../lib/company/eligibility';
import { attention, buildPipeline, calendar, totals, type StoredReport } from '../lib/tenders/pipeline';
import { sampleProfile } from '../lib/company/sample';

const today = new Date(2026, 9, 16); // Fri 16 Oct 2026
const profile = sampleProfile(today);

const report = (id: string, due: string | undefined, extra: Partial<NonNullable<StoredReport['summary']>['metadata']> = {}): StoredReport => ({
  id,
  fileName: `${id}.pdf`,
  uploadedAt: '2026-10-01T00:00:00Z',
  summary: {
    metadata: {
      nameOfWork: `Work ${id}`,
      estimatedCost: 'Rs. 15,64,86,955/-',
      emdAmount: 'Rs. 25,64,870/-',
      completionMonths: 15,
      keyDates: due ? [{ kind: 'submission', date: due, time: '15:00', printed: '' }] : [],
      ...extra,
    },
  },
  compliance: { riskLevel: 'Medium', complianceScore: 57 },
});

test('eligibility against the standard CPWD criteria', () => {
  const ok = checkEligibility(profile, 156486955, 15, today)!;
  assert.equal(ok.verdict, 'yes');
  assert.equal(eligibilitySummary(ok), 'Yes · 4 of 4 checks');

  const big = checkEligibility(profile, 2_207_600_000, 24, today)!; // ₹ 220.76 cr
  assert.equal(big.verdict, 'no');
  assert.equal(big.checks.find(c => c.label.startsWith('Similar works'))!.result, 'fail');

  const thin = checkEligibility({ legalName: 'X', registrationClass: 'I', registeredAddress: 'Y' }, 156486955, 15, today)!;
  assert.equal(thin.verdict, 'check');
  assert.equal(checkEligibility(profile, undefined, 15, today), null);
});

test('the pipeline orders open deadlines first and derives stages from the draft', () => {
  const reports = [report('late', '2026-11-03'), report('soon', '2026-10-20'), report('closed', '2026-09-01'), report('nodate', undefined)];
  const bids = [{ id: 'soon', sections: [{ content: 'Date of inspection: [dd/mm/yyyy]. Signatory [name]' }] }];
  const entries = buildPipeline(reports, bids, { closed: 'submitted' }, profile, today);
  assert.deepEqual(entries.map(e => e.id), ['soon', 'late', 'nodate', 'closed']);
  assert.deepEqual([entries[0].stage, entries[0].blanks], ['drafting', 2]);
  assert.equal(entries[1].stage, 'analysed');
  assert.equal(entries[3].stage, 'submitted');

  const sum = totals(entries, today);
  assert.deepEqual(sum.dueThisWeek.map(e => e.id), ['soon']);
  assert.equal(sum.blanks, 2);
  assert.equal(sum.emdLocked, 2564870);
  assert.equal(sum.emdToDeposit, 2 * 2564870);

  const todo = attention(entries, profile, today);
  assert.match(todo[0].text, /^Fill 2 blanks in the Work soon bid/);
  assert.ok(todo.some(t => t.text === 'Add the bid due date for Work nodate'));

  const { days, events } = calendar(entries, today);
  assert.equal(days[0], '2026-10-12');
  assert.deepEqual(events.map(e => e.date), ['2026-10-20', '2026-11-03']);
});
