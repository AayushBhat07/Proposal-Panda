import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findDraftProblem,
  isCodesIn,
  keyClauseLines,
  redactUnknownStandards,
  MODEL_SECTIONS,
  parseProgramme,
  renderProgramme,
  tidyDraft,
} from '../features/bid-generation/services/foundationBidGenerator';

const section = { id: 's', title: 'Section', cover: 'technical' as const, brief: '' };
const clauses = [
  '- Compensation for delay (Clause 2): 1.5% per month, maximum 10%.',
  '- Price variation / escalation clause (10CC): Does not apply.',
  '- Similar works: three works of Rs. 7.45 crore each.',
].join('\n');
const facts = {
  months: 18,
  emdAmount: 'Rs. 27,24,900',
  clauses,
  nitRef: '14/EE/PCD-II/2026-27',
  tenderTitle: 'Hostel block',
  pan: 'ABCDE1234F',
  gstin: '27ABCDE1234F1Z5',
};

test('rejects drafts that invent company eligibility facts', () => {
  const invented = [
    'Our average annual financial turnover during the last three consecutive financial years was Rs. 10.11 crore.',
    'Our company has completed similar works in the past, meeting the eligibility criteria.',
    'We confirm that our company has not incurred any loss in more than two years.',
    'We confirm that our company has the necessary technical capabilities.',
    'We are confident that our technical capabilities, experience, and resources make us an ideal candidate.',
    'The bidder has valid EPF/ESI registration.',
    'Quality tests will include cube tests and certification by a registered Chartered Accountant.',
    'GSTIN and PAN (ABCD E1234F) enclosed.',
  ];
  for (const text of invented) assert.ok(findDraftProblem(section, `1. ${text}`, facts), text);
});

test('accepts drafts that only restate tender requirements', () => {
  const ok =
    '1. Average annual turnover of Rs. 7.45 crore is required; supporting documents enclosed at [Annexure __].\n' +
    '2. Please clarify whether Clause 2 compensation is capped at 10%.';
  assert.equal(findDraftProblem(section, ok, facts), undefined);
});

test('parses grouped and tabular month ranges', () => {
  assert.equal(parseProgramme('Month 1: Mobilisation\nMonth 16-18: Finishing').size, 4);
  assert.equal(parseProgramme('Months 1-3: Foundations\nMonths 16 to 18: Finishing').size, 6);
  assert.equal(parseProgramme('| Month 1-3 | Earthwork | Foundations |\n| Month 16-18 | Finishing |').size, 6);
  assert.equal(parseProgramme('| Month 1-3 | Earthwork | Foundations |').get(2), 'Earthwork; Foundations');
});

test('programme has one line per month and leaves out defect liability', () => {
  const draft = 'Month 1: Mobilisation\nMonths 2-4: Foundations\nMonth 16-18: Finishing, defect liability period';
  const lines = renderProgramme(draft, 18).split('\n').filter(l => l.startsWith('Month'));
  assert.equal(lines.length, 18);
  assert.equal(lines[2], 'Month 3: Foundations');
  assert.equal(lines[17], 'Month 18: Finishing');
  assert.equal(lines[5], 'Month 6: [activities to be planned]');
  assert.doesNotMatch(lines.join('\n'), /defect liability/i);
});

test('strips the model preamble and closing note', () => {
  assert.equal(
    tidyDraft('Here is the "Letter" section of the bid for X:\n\nDear Sir,\nBody.\n\nNote: based on the specifications.'),
    'Dear Sir,\nBody.'
  );
});

test('compliance may only mark clauses not applicable where the analysis does', () => {
  const compliance = MODEL_SECTIONS.compliance;
  assert.match(
    findDraftProblem(compliance, 'Compensation for delay under Clause 2: Does not apply for this work.', facts) ?? '',
    /Clause 2/
  );
  assert.equal(findDraftProblem(compliance, 'Price variation under Clause 10CC: Does not apply.', facts), undefined);
});

test('transmittal must state the EMD amount', () => {
  const letter = MODEL_SECTIONS.transmittal;
  assert.ok(findDraftProblem(letter, 'EMD of Rs. [insert value] enclosed.', facts));
  assert.equal(findDraftProblem(letter, 'EMD of Rs. 27,24,900/- enclosed.', facts), undefined);
});

test('accepts tax IDs quoted exactly', () => {
  assert.equal(findDraftProblem(section, 'GSTIN 27ABCDE1234F1Z5, PAN ABCDE1234F.', facts), undefined);
});

test('drops queries that misquote the tender, then needs five left', () => {
  const draft = [
    '1. Considering the absence of a clear dispute resolution mechanism, please clarify.',
    '2. Is delay compensation not covered by Clause 10CC?',
    '3. Will the price variation exclusion under Clause 10CC be reviewed for steel?',
    '4. How is the security deposit recovered from running bills?',
    '5. Who bears GRIHA certification costs?',
    '6. Is RMC plant approval by the department required?',
    '7. Will site access be available through the monsoon?',
  ].join('\n');
  const cleaned = MODEL_SECTIONS.queries.clean!(draft);
  assert.equal(
    cleaned,
    [
      '1. Will the price variation exclusion under Clause 10CC be reviewed for steel?',
      '2. Who bears GRIHA certification costs?',
      '3. Is RMC plant approval by the department required?',
      '4. Will site access be available through the monsoon?',
    ].join('\n')
  );
  assert.match(findDraftProblem(MODEL_SECTIONS.queries, cleaned, facts) ?? '', /only 4/);
});

test('rejects a programme that lays masonry before the frame', () => {
  const draft = 'Months 1-3: Foundations\nMonths 4-6: AAC masonry\nMonths 7-12: RCC frame\nMonths 13-18: Flooring';
  assert.match(findDraftProblem(MODEL_SECTIONS.programme, draft, facts) ?? '', /masonry before RCC frame/);
  const ok = 'Months 1-3: Foundations\nMonths 4-9: RCC frame\nMonths 10-12: AAC masonry\nMonths 13-18: Flooring';
  assert.equal(findDraftProblem(MODEL_SECTIONS.programme, ok, facts), undefined);
});

test('compliance carries the key clauses from the analysis', () => {
  const out = MODEL_SECTIONS.compliance.finish!('1. EMD enclosed.', facts);
  assert.match(out, /- Compensation for delay \(Clause 2\): 1\.5% per month, maximum 10%\./);
  assert.match(out, /10CC\): Does not apply/);
  assert.doesNotMatch(out, /Similar works/);
});

test('letter gets the address and subject line', () => {
  const out = MODEL_SECTIONS.transmittal.finish!('Sir,\nWe submit our bid.', facts);
  assert.match(out, /^To,\nThe Executive Engineer,/);
  assert.match(out, /Sub: Submission of bid for "Hostel block" against NIT No\. 14\/EE\/PCD-II\/2026-27\n\nSir,/);
});

test('key clauses keep the value lines under their headings', () => {
  const run6 = [
    '- Similar works:',
    '  - Three works of Rs. 7.45 crore each.',
    '- Compensation for delay:',
    '  - Applies under Clause 2, with a maximum cap of 10% of the tendered value.',
    '- Price variation / escalation clause (e.g. 10CC):',
    '  - Does not apply to this work.',
    '- Mobilisation or secured advance:',
    '  - 10% of the tendered value at 10% simple interest against a bank guarantee of 110%.',
    '- Security deposit and performance guarantee:',
    '  - Security Deposit: 2.5% of the tendered value, to be recovered from running bills.',
  ].join('\n');
  const lines = keyClauseLines(run6, '1.5% per month, maximum 10%');
  assert.equal(lines[0], 'Compensation for delay (Clause 2): 1.5% per month, maximum 10%');
  assert.ok(lines.some(l => /10CC\): Does not apply/.test(l)));
  assert.ok(lines.some(l => /advance: 10% .*10% simple interest/.test(l)));
  assert.ok(!lines.some(l => /Similar works/.test(l)));
  // Unindented values directly under a heading are kept too
  const flat = keyClauseLines('Price variation (10CC):\nDoes not apply.\nSimilar works: three works.');
  assert.deepEqual(flat, ['Price variation (10CC): Does not apply.']);
});

test('letter is addressed to the inviting office', () => {
  const out = MODEL_SECTIONS.transmittal.finish!('Sir,', {
    ...facts,
    invitingOffice: 'Executive Engineer, Pune Central Division-II, Nirman Bhawan, Pune - 411001',
  });
  assert.match(out, /^To,\nThe Executive Engineer,\nPune Central Division-II,\nNirman Bhawan,\nPune - 411001\n/);
});

test('programme schedules the road when the draft leaves it out', () => {
  const draft = 'Months 1-3: Foundations\nMonths 4-9: RCC frame\nMonths 10-18: Finishes';
  const lines = renderProgramme(draft, 18, true).split('\n');
  assert.equal(lines[15], 'Month 16: Finishes; approach road and drainage works (outside monsoon)');
  assert.doesNotMatch(lines[14], /road/);
});

test('queries need at least five numbered lines', () => {
  const one = '1. Please clarify RMC plant approval.';
  assert.match(findDraftProblem(MODEL_SECTIONS.queries, one, facts) ?? '', /only 1/);
});

test('replaces IS codes the tender never mentions', () => {
  const known = isCodesIn('Concrete to IS 10262:2019; AAC blocks to IS 2185 (Part 3).');
  assert.equal(
    redactUnknownStandards('APP membrane to IS 732:1973; mix to IS 10262:2019; blocks to IS 2185 Part 3.', known),
    'APP membrane to [IS code as per tender]; mix to IS 10262:2019; blocks to IS 2185 Part 3.'
  );
});

test('rejects price commitments and wrong road terms', () => {
  assert.ok(findDraftProblem(section, 'We will execute the work within the specified budget.', facts));
  assert.ok(findDraftProblem(section, 'GSB (Good Strength Base) shall be laid.', facts));
});

test('compliance drops its own lines on quoted terms and quotes the NIT', () => {
  const draft = '1. EMD of Rs. 27,24,900 enclosed.\n2. The bidder shall recover the security deposit.\n3. GRIHA measures will be followed.';
  const cleaned = MODEL_SECTIONS.compliance.clean!(draft);
  assert.equal(cleaned, '1. EMD of Rs. 27,24,900 enclosed.\n2. GRIHA measures will be followed.');
  const out = MODEL_SECTIONS.compliance.finish!(cleaned, {
    ...facts,
    keyTerms: [{ label: 'Price variation (Clause 10CC)', text: 'Clause 10CC shall not be applicable.' }],
  });
  assert.match(out, /quoted from the NIT[^\n]*\n- Price variation \(Clause 10CC\): "Clause 10CC shall not be applicable\."$/);
});

test('rejects a programme that idles in testing and handover', () => {
  const draft = 'Months 1-3: Foundations\nMonths 4-9: RCC frame\nMonths 10-12: Flooring and finishes\nMonths 13-15: Testing and handover preparation\nMonths 16-18: Final testing';
  assert.match(findDraftProblem(MODEL_SECTIONS.programme, draft, facts) ?? '', /testing and handover only/);
});
