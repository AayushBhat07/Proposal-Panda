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
  findNameOfWork,
  findTenderKind,
  findWorksType,
  isMaintenanceWork,
  SCHEDULE_WISE_EMD,
  pickChunks,
  selectSourceText,
  TenderSummarizationService,
} from '../features/summarization/services/summarizer';
import { UnreadableDocumentError } from '../features/summarization/services/textExtractor';

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

// Layouts copied from real tenders (IIT Kanpur, AIIMS Raipur, PRL/ISRO, DFCCIL, BMC, GeM, East Central Railway).
test('reads NIT numbers in the forms real tenders print them', () => {
  assert.equal(findNitReference('NIT No: 50/Civil/D1/2026-27\n1 Name of work'), '50/Civil/D1/2026-27');
  assert.equal(findNitReference('N.I.T. NO. 21/EE/AIIMS/RPR/2018-19 (2nd Call) Date: - 24/11/2018'), '21/EE/AIIMS/RPR/2018-19');
  assert.equal(findNitReference('E-Tender Notice No.: PRL/CMG/e-Tender 19/2024-25 dated 07-11-2024'), 'PRL/CMG/e-Tender 19/2024-25');
  assert.equal(findNitReference('Tender NO: TDL/EN/RPF POST BUILDING/2020/01 DATED: 21.10.2020'), 'TDL/EN/RPF POST BUILDING/2020/01');
  assert.equal(findNitReference('Bid No. - 2026_MCGM_1286135_1\nSubject: Supply'), '2026_MCGM_1286135_1');
  assert.equal(findNitReference('Bid Number/बोली क्रमांक (बिड संख्या):\nGEM/2024/B/4869384\nDated'), 'GEM/2024/B/4869384');
  assert.equal(findNitReference('No.EE/NIRD/2016-17/NIT/14 F.No. :EE/CMU/2015-16/259'), 'EE/NIRD/2016-17/NIT/14');
  assert.equal(findNitReference('as required in the NIT at CPP portal'), undefined);
});

test('reads completion periods written in words, days and table rows', () => {
  assert.equal(findCompletionMonths('4 Duration of contract : Twelve (12) months'), 12);
  assert.equal(findCompletionMonths('4 Duration of contract : Two (02) Months'), 2);
  assert.equal(findCompletionMonths('TIME ALLOWED: 90 (Ninety) Days'), 3);
  assert.equal(findCompletionMonths('(b) Completion Period 12 Months'), 12);
  assert.equal(findCompletionMonths('1.4 Duration of Contract 06 months'), 6);
  assert.equal(findCompletionMonths('Duration of 30 Minutes'), undefined);
});

test('reads amounts from rows, next-line table cells and lakh figures, but not thresholds or rules', () => {
  assert.equal(findEmdAmount('3 Earnest Money Deposit (Rs.) : Rs. 33446/-'), 'Rs. 33446');
  assert.equal(findEstimatedCost('2 Estimated cost (including GST) : Rs. 1672324/-, The cost is for 12 months.'), 'Rs. 1672324');
  assert.equal(findEstimatedCost('ESTIMATED COST\nPUT TO TENDER: Rs. 38, 32,203/-\nEARNEST MONEY: Rs. 76,700/-'), 'Rs. 38,32,203');
  assert.equal(findEmdAmount('ESTIMATED COST\nPUT TO TENDER: Rs. 38, 32,203/-\nEARNEST MONEY: Rs. 76,700/-'), 'Rs. 76,700');
  const isro = [
    'Estimated cost put to tender रु',
    '19.66 लाख',
    '₹ 19.66 Lakhs',
    'Earnest Money Deposit (EMD)',
    '₹ 39,320 /-',
    'similar works each costing not less than the amount equal to 40% of the estimated cost (i.e. ₹ 7.86 lakhs)',
  ].join('\n');
  assert.equal(findEmdAmount(isro), 'Rs. 39,320');
  assert.equal(findEstimatedCost(isro.split('\n').slice(3).join('\n')), undefined);
  assert.equal(findEstimatedCost(isro), 'Rs. 19.66 lakh');
  assert.equal(findEmdAmount('b) EMD will be Rs. 50 lakh for tenders valuing above Rs. 50 Cr.'), undefined);
  assert.equal(findEstimatedCost('Works having estimated value of Rs. 10 lakhs and above.'), undefined);
  assert.equal(findEmdAmount('5.2.1 Amount of EMD (rounded off to nearest higher Rs. 10 (ten))'), undefined);
});

test('reads Clause 10CC from CPWD Schedule F tables', () => {
  const iitk = 'Clause 10 CA NOT APPLICABLE\nClause 10 CC Increase/Decrease in Price of\nmaterials/wages\nNOT APPLICABLE\nClause 11 CPWD Specifications of';
  const terms = Object.fromEntries(findKeyTerms(iitk).map(t => [t.label, t.text]));
  assert.equal(terms['Price variation (Clause 10CC)'], 'Clause 10 CC Increase/Decrease in Price of materials/wages NOT APPLICABLE.');
  const aiims =
    'Clause10CC\nClause 10CC to be applicable in contracts\nwith sipulated period of compensation\nExceeding the period shown in next column : Not Applicable\nMaterial covered under this';
  assert.match(
    Object.fromEntries(findKeyTerms(aiims).map(t => [t.label, t.text]))['Price variation (Clause 10CC)'],
    /: Not Applicable\.$/
  );
});

test('skips unfilled template blanks and quotes wrapped sentences whole', () => {
  const text = [
    'of Contract, Mobilization Advance up to ___% (___ percent) of the original contract.',
    'Mobilisation advance – This shall be limited to 10% of the contract value and payable',
    'in two instalments.',
  ].join('\n');
  assert.equal(
    Object.fromEntries(findKeyTerms(text).map(t => [t.label, t.text]))['Mobilisation advance'],
    'Mobilisation advance – This shall be limited to 10% of the contract value and payable in two instalments.'
  );
});

test('tells works, supply and services tenders apart', () => {
  assert.equal(findTenderKind('NOTICE INVITING TENDER\nName of work: Construction of boundary wall. Percentage rate tender.'), 'works');
  assert.equal(findTenderKind('Bid Number: GEM/2024/B/1\nItem Category: Laptop\nConsignee details. Warranty 3 years.'), 'supply');
  assert.equal(findTenderKind('Subject: Supply, Installation, Testing, Commissioning and Maintenance of Computers'), 'supply');
  assert.equal(findTenderKind('Hiring of agencies for security personnel to safeguard municipal offices. Manpower.'), 'services');
});

test('picks the chunks most about a topic, not just the first that mention it', () => {
  const chunk = (index: number, text: string) => ({ index, text, tokenCount: 0, source: 'Full Text' });
  const chunks = [
    chunk(0, 'Index. EMD scan copy. Notice.'),
    chunk(1, 'General instructions. EMD to be paid online.'),
    chunk(2, 'Schedule: Earnest money Rs 33446. Performance guarantee 5%. Security deposit 2.5%. Time allowed 12 months.'),
  ];
  const picked = pickChunks(chunks, ['emd', 'earnest money', 'performance guarantee', 'security deposit', 'time allowed'], 1);
  assert.deepEqual(picked.map(c => c.index), [2]);
});

test('reads the name of work, including wrapped lines, and spots maintenance contracts', () => {
  assert.equal(
    findNameOfWork('NIT No: 50/Civil/D1/2026-27\n1 Name of work : Carrying out minor maintenance civil\nworks of Out reach Centre Noida.\n2 Estimated cost : Rs. 1672324/-'),
    'Carrying out minor maintenance civil works of Out reach Centre Noida'
  );
  assert.equal(
    findNameOfWork('NAME OF WORK: - “Raising of boundry wall height by cocertiana coil and\nmiscellaneous work at Residential Complex, AIIMS\nRaipur.”\nESTIMATED COST'),
    'Raising of boundry wall height by cocertiana coil and miscellaneous work at Residential Complex, AIIMS Raipur'
  );
  assert.equal(findNameOfWork('Sub: Submission of Technical Proposal.\nDear Sir,'), undefined);
  assert.equal(findNameOfWork('No. Name of Work\nNature\nof\nWork'), undefined);
  assert.equal(isMaintenanceWork('Carrying out minor maintenance civil works of Out reach Centre Noida', ''), true);
  assert.equal(isMaintenanceWork('Construction of RPF Post building at New Khurja', ''), false);
});

test('GeM bids with schedule-wise EMD report no single figure', () => {
  const gem = 'Schedule 1 EMD Amount/ईएमडी राशि (In INR) 8454\nSchedule 2 EMD Amount/ईएमडी राशि (In INR) 7477';
  assert.equal(findEmdAmount(gem), SCHEDULE_WISE_EMD);
});

test('tells building, infrastructure and maintenance works apart', () => {
  assert.equal(findWorksType('Construction of RPF Post building at New Khurja & New Ekdil', ''), 'building');
  assert.equal(findWorksType('Construction of Service road and Diversion road at LC No. 66', ''), 'infrastructure');
  assert.equal(findWorksType('Raising of boundry wall height by concertina coil', ''), 'infrastructure');
  assert.equal(findWorksType('Raising of boundry wall height by cocertiana coil and miscellaneous work at Residential Complex, AIIMS Raipur', ''), 'infrastructure');
  assert.equal(findWorksType('Carrying out minor maintenance civil works of Out reach Centre Noida', ''), 'maintenance');
  assert.equal(findWorksType(undefined, 'Construction of G+4 RCC framed quarters'), 'building');
});

test('rejects blank text before any model call', async () => {
  const service = new TenderSummarizationService();
  for (const fullText of ['', '   \n\t ']) {
    await assert.rejects(
      service.summarizeTender({ fullText, tenderId: 'EMPTY', tenderTitle: 'Empty' }),
      UnreadableDocumentError
    );
  }
});

test('chunking still moves forward when the overlap is as large as the chunk', () => {
  const service = new TenderSummarizationService({ maxTokensPerChunk: 4, overlapTokens: 8 });
  const chunks = (service as unknown as { chunkText(text: string): unknown[] }).chunkText('a b c d e f');
  assert.ok(chunks.length > 0 && chunks.length <= 6);
});
