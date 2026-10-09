import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  findDraftProblem,
  MODEL_SECTIONS,
  parseProgramme,
  renderProgramme,
  tidyDraft,
} from '../features/bid-generation/services/foundationBidGenerator';

const section = { id: 's', title: 'Section', cover: 'technical' as const, brief: '' };
const facts = { months: 18, emdAmount: 'Rs. 27,24,900', clauses: 'Price variation clause (10CC): Does not apply.' };

test('rejects drafts that invent company eligibility facts', () => {
  const invented = [
    'Our average annual financial turnover during the last three consecutive financial years was Rs. 10.11 crore.',
    'Our company has completed similar works in the past, meeting the eligibility criteria.',
    'We confirm that our company has not incurred any loss in more than two years.',
    'We confirm that our company has the necessary technical capabilities.',
    'We are confident that our technical capabilities, experience, and resources make us an ideal candidate.',
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
