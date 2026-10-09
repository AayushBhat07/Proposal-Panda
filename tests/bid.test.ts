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
  sectionsFor,
  fitBriefToTender,
  MAINTENANCE_PROGRAMME,
  INFRASTRUCTURE_PROGRAMME,
  methodologyItems,
  gradesIn,
  redactUnknownGrades,
} from '../features/bid-generation/services/foundationBidGenerator';
import { declarations, documentChecklist, financialBid } from '../features/bid-generation/services/bidTemplates';

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

test('goods and services tenders get their own sections and proformas', () => {
  const supply = sectionsFor('supply');
  assert.equal(supply.methodology.title, 'Supply, Delivery and Quality Plan');
  assert.equal(supply.scope.title, 'Understanding of Scope of Supply');
  assert.doesNotMatch(supply.queries.brief, /GRIHA|RMC/);
  assert.equal(sectionsFor('services').methodology.title, 'Service Delivery Methodology');
  assert.equal(sectionsFor('works'), MODEL_SECTIONS);

  const company = { legalName: 'Panda Infra Pvt Ltd', registrationClass: 'Class I-A', gstin: '27ABCDE1234F1Z5', panNumber: 'ABCDE1234F', registeredAddress: 'Pune' } as never;
  const input = { nitRef: 'GEM/2024/B/1', tenderTitle: 'Laptops', company };
  assert.match(documentChecklist({ ...input, kind: 'supply' }), /OEM authorisation/);
  assert.doesNotMatch(documentChecklist({ ...input, kind: 'supply' }), /site inspection|bid capacity/i);
  assert.doesNotMatch(declarations({ ...input, kind: 'services' }), /Site Inspection/);
  assert.match(declarations({ ...input, kind: 'works' }), /Site Inspection/);
  assert.match(financialBid({ ...input, kind: 'services' }), /Minimum wages/);
  assert.match(documentChecklist({ ...input, kind: 'works' }), /^16\. Integrity Pact/m);
});

test('briefs mention GRIHA and RMC only when the tender does', () => {
  const brief = MODEL_SECTIONS.queries.brief;
  assert.doesNotMatch(fitBriefToTender(brief, 'minor maintenance civil works, paver blocks'), /GRIHA|RMC|\(e\.g\.\s*\)|\s,/);
  assert.match(fitBriefToTender(brief, 'achieve GRIHA 3-star; ready mix concrete from RMC plant'), /GRIHA, RMC plant approval/);
  assert.doesNotMatch(fitBriefToTender(MODEL_SECTIONS.methodology.brief, 'boundary wall'), /GRIHA/);
});

test('a maintenance contract programme may not invent new construction', () => {
  const facts = { months: 3, clauses: '', nitRef: 'X', tenderTitle: 'X', pan: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5' };
  const built = 'Month 1: Mobilisation\nMonth 2: Construction of RCC frame, floor by floor\nMonth 3: Testing';
  assert.match(findDraftProblem(MAINTENANCE_PROGRAMME, built, facts) ?? '', /new construction/);
  const ok = 'Month 1: Mobilisation and paver block repairs\nMonth 2: Sanitary repairs as per work orders\nMonth 3: Painting';
  assert.equal(findDraftProblem(MAINTENANCE_PROGRAMME, ok, facts), undefined);
});

test('methodology covers only the items the tender names, and unknown grades are redacted', () => {
  const road = 'Construction of Service road and Diversion road at LC No. 66. Earthwork in embankment, GSB, WMM, bituminous surfacing. NP3 hume pipe culverts.';
  assert.equal(methodologyItems(road), 'earthwork and foundations; roads; bridges and culverts; drainage');
  assert.match(methodologyItems('G+4 RCC framed quarters with AAC masonry, vitrified flooring, water supply'), /RCC superstructure.*masonry.*flooring.*water supply/);
  assert.match(methodologyItems('nothing recognisable'), /^earthwork and foundations; RCC superstructure/);
  const tender = gradesIn('Concrete M-20 and steel Fe 415 as per MORTH.');
  assert.equal(
    redactUnknownGrades('Use M25 concrete and Fe500D bars; M20 for culverts with Fe 415.', tender),
    'Use [concrete grade as per tender] concrete and [steel grade as per tender] bars; M20 for culverts with Fe 415.'
  );
});

test('road, building and maintenance works get their own programmes', () => {
  const facts = { months: 3, clauses: '', nitRef: 'X', tenderTitle: 'X', pan: 'ABCDE1234F', gstin: '27ABCDE1234F1Z5' };
  const building = 'Month 1: Mobilisation\nMonth 2: RCC frame floor by floor\nMonth 3: Masonry and flooring';
  assert.match(findDraftProblem(INFRASTRUCTURE_PROGRAMME, building, facts) ?? '', /building work/);
  const road = 'Month 1: Mobilisation and survey\nMonth 2: Earthwork and GSB\nMonth 3: WMM, bituminous surfacing, handover';
  assert.equal(findDraftProblem(INFRASTRUCTURE_PROGRAMME, road, facts), undefined);
});

test('a one-page notice that names no items gets the common items, without GRIHA', () => {
  assert.doesNotMatch(methodologyItems('Tender notice. EMD by demand draft.'), /GRIHA/);
});

test('road works get only road items, and IS codes with a year are redacted whole', () => {
  const text = 'Service road. NP3 class RCC pipes. Earthwork. Bituminous macadam. Flooring as per general conditions.';
  assert.equal(methodologyItems(text, 'infrastructure', 'Construction of Service road'), 'earthwork and foundations; roads; drainage');
  assert.equal(redactUnknownStandards('concrete as per IS 456-2000', new Set()), 'concrete as per [IS code as per tender]');
  assert.equal(tidyDraft('Plan.\n\nPlease note that this section only provides a general outline.'), 'Plan.');
});
