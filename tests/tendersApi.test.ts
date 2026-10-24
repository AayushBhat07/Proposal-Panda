import { test } from 'node:test';
import assert from 'node:assert/strict';
import { request, params } from './helpers';
import * as registerRoute from '../app/api/tenders/route';
import * as tenderRoute from '../app/api/tenders/[id]/route';
import * as bidRoute from '../app/api/tenders/[id]/bid/route';
import * as fileRoute from '../app/api/tenders/[id]/file/route';
import * as companyRoute from '../app/api/company/route';
import * as answersRoute from '../app/api/answers/route';
import * as importRoute from '../app/api/import/route';
import { getDb } from '../lib/db/client';
import { addTender } from '../lib/db/repos/tenders';

const report = (id: string) => ({
  id,
  fileName: `${id}.pdf`,
  uploadedAt: '2026-10-01T10:00:00.000Z',
  summary: { metadata: { tenderTitle: `Works ${id}`, keyDates: [] } },
  compliance: { riskLevel: 'Low' as const, complianceScore: 80 },
});
const bid = (id: string, content = 'GSTIN {GSTIN}') => ({ id, tenderId: id, sections: [{ id: 's1', content }] });

test('what one person adds, everyone else reads', async () => {
  addTender(getDb(), report('T-SHARED'), 'analyst@proposalpanda.dev');
  const asViewer = await registerRoute.GET(await request('Viewer', '/api/tenders'));
  assert.equal(asViewer.status, 200);
  const { reports } = await asViewer.json();
  assert.ok(reports.some((r: { id: string }) => r.id === 'T-SHARED'));

  const saved = await bidRoute.PUT(
    await request('BidWriter', '/api/tenders/T-SHARED/bid', { method: 'PUT', body: { bid: bid('T-SHARED') } }),
    params({ id: 'T-SHARED' })
  );
  assert.equal(saved.status, 200);
  const one = await tenderRoute.GET(await request('Viewer', '/api/tenders/T-SHARED'), params({ id: 'T-SHARED' }));
  assert.equal((await one.json()).bid.sections[0].content, 'GSTIN {GSTIN}');
});

test('Viewers cannot change anything', async () => {
  addTender(getDb(), report('T-RO'), 'analyst@proposalpanda.dev');
  const asViewer = (method: string, path: string, body: unknown) => request('Viewer', path, { method, body });
  const p = params({ id: 'T-RO' });
  assert.equal((await bidRoute.PUT(await asViewer('PUT', '/api/tenders/T-RO/bid', { bid: bid('T-RO') }), p)).status, 403);
  assert.equal((await tenderRoute.PATCH(await asViewer('PATCH', '/api/tenders/T-RO', { stage: 'won' }), p)).status, 403);
  assert.equal((await companyRoute.PUT(await asViewer('PUT', '/api/company', { companyProfile: { legalName: 'X' } }))).status, 403);
  assert.equal((await answersRoute.PUT(await asViewer('PUT', '/api/answers', { answers: { a: 'b' } }))).status, 403);
  assert.equal((await registerRoute.GET(await request(null, '/api/tenders'))).status, 401);
});

test('stages and corrected dates are saved; unknown stages are refused', async () => {
  addTender(getDb(), report('T-STAGE'), 'analyst@proposalpanda.dev');
  const p = params({ id: 'T-STAGE' });
  const patch = async (body: unknown) =>
    tenderRoute.PATCH(await request('TenderAnalyst', '/api/tenders/T-STAGE', { method: 'PATCH', body }), p);
  assert.equal((await patch({ stage: 'submitted' })).status, 200);
  assert.equal((await patch({ stage: 'bribed' })).status, 400);
  assert.equal((await patch({ stage: 'toString' })).status, 400, 'prototype keys are not stages');
  const dates = [{ kind: 'submission', date: '2026-11-01' }];
  const updated = await (await patch({ keyDates: dates })).json();
  assert.equal(updated.stage, 'submitted');
  assert.deepEqual(updated.report.summary.metadata.keyDates, dates);
  assert.equal(updated.report.summary.metadata.tenderTitle, 'Works T-STAGE');
  assert.equal((await tenderRoute.PATCH(await request('Admin', '/api/tenders/NOPE', { method: 'PATCH', body: { stage: 'won' } }), params({ id: 'NOPE' }))).status, 404);
});

test('the company file never stores GSTIN or PAN', async () => {
  const response = await companyRoute.PUT(
    await request('BidWriter', '/api/company', {
      method: 'PUT',
      body: { companyProfile: { legalName: 'Acme', gstin: '07AAAAA0000A1Z5', panNumber: 'AAAAA0000A' }, isComplete: true },
    })
  );
  assert.equal(response.status, 200);
  const stored = await (await companyRoute.GET(await request('Viewer', '/api/company'))).json();
  assert.equal(stored.companyProfile.legalName, 'Acme');
  assert.equal(stored.isComplete, true);
  assert.ok(!('gstin' in stored.companyProfile) && !('panNumber' in stored.companyProfile));
});

test('saved answers merge', async () => {
  const put = async (answers: Record<string, string>) =>
    answersRoute.PUT(await request('BidWriter', '/api/answers', { method: 'PUT', body: { answers } }));
  await put({ bank: 'SBI' });
  await put({ signatory: 'R. Kumar' });
  const { answers } = await (await answersRoute.GET(await request('Viewer', '/api/answers'))).json();
  assert.equal(answers.bank, 'SBI');
  assert.equal(answers.signatory, 'R. Kumar');
});

test('browser import adds only what is new and what the role may add', async () => {
  const body = {
    reports: [report('T-IMP1'), report('T-IMP2'), { id: '../evil', uploadedAt: 'x' }],
    bids: [bid('T-IMP1'), bid('T-MISSING')],
    stages: { 'T-IMP1': 'won', 'T-IMP2': 'nonsense' },
    answers: { fresh: 'yes' },
  };
  const asAnalyst = await importRoute.POST(await request('TenderAnalyst', '/api/import', { method: 'POST', body }));
  const first = await asAnalyst.json();
  assert.deepEqual(first.imported, { reports: 2, stages: 1 });
  assert.deepEqual(first.refused.sort(), ['answers', 'bids']);

  const asWriter = await importRoute.POST(await request('BidWriter', '/api/import', { method: 'POST', body }));
  const second = await asWriter.json();
  assert.equal(second.imported.reports, 0, 'same ids are not added twice');
  assert.equal(second.imported.bids, 1, 'only the bid whose tender exists');
  assert.equal(second.imported.stages, 0, 'a stage already set stays');
  assert.deepEqual(second.refused, []);
});

test('the uploaded NIT is kept with its tender and served back as stored', async () => {
  const data = Buffer.from('%PDF-1.4 original nit');
  addTender(getDb(), report('T-FILE'), 'analyst@proposalpanda.dev', { name: 'NIT 12.pdf', type: 'application/pdf', data });
  const one = await tenderRoute.GET(await request('Viewer', '/api/tenders/T-FILE'), params({ id: 'T-FILE' }));
  assert.equal((await one.json()).hasFile, true);

  const file = await fileRoute.GET(await request('Viewer', '/api/tenders/T-FILE/file'), params({ id: 'T-FILE' }));
  assert.equal(file.status, 200);
  assert.equal(file.headers.get('content-type'), 'application/pdf');
  assert.ok(Buffer.from(await file.arrayBuffer()).equals(data));
  assert.equal((await fileRoute.GET(await request(null, '/api/tenders/T-FILE/file'), params({ id: 'T-FILE' }))).status, 401);
  assert.equal((await fileRoute.GET(await request('Viewer', '/api/tenders/T-RO/file'), params({ id: 'T-RO' }))).status, 404);
});
