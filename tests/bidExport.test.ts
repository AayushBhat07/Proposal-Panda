import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Packer } from 'docx';
import mammoth from 'mammoth';
import { countBlanks, splitBlanks, unwrapLines } from '../features/bid-generation/services/draftText';
import { buildCoverDocument } from '../features/bid-generation/services/bidDocx';
import type { FoundationBid } from '../features/bid-generation/types/bid.types';

test('counts and splits the placeholders a draft leaves', () => {
  const text = 'Inspected on [dd/mm/yyyy]. Bid capacity = ([A] × [N] × 2) − [B] = ₹ [___].';
  assert.equal(countBlanks(text), 5);
  assert.deepEqual(
    splitBlanks('Date: [dd/mm/yyyy] done').map(p => [p.text, p.blank]),
    [['Date: ', false], ['[dd/mm/yyyy]', true], [' done', false]]
  );
  assert.equal(countBlanks('No blanks here.'), 0);
  assert.equal(countBlanks("[Edit needed: the local model's draft of this section was withheld because it does not state the EMD amount. Write this section manually.]"), 1);
});

test('rejoins hard-wrapped proforma lines but keeps lists and short lines', () => {
  const wrapped = 'We, Acme, have read all the terms and conditions of NIT No. 41 (Staff quarters), including the\nNIT and BOQ.';
  assert.equal(unwrapLines(wrapped), 'We, Acme, have read all the terms and conditions of NIT No. 41 (Staff quarters), including the NIT and BOQ.');
  assert.equal(unwrapLines('Place: [city]    Date: 09 Oct\nSignature'), 'Place: [city]    Date: 09 Oct\nSignature');
  const list = 'Upload as one PDF in this order, unless the NIT specifies another order and the department agrees\n1. EMD';
  assert.equal(unwrapLines(list), list);
});

test('a cover file holds only that cover', async () => {
  const bid: FoundationBid = {
    tenderId: 'T-1',
    tenderTitle: 'Staff quarters',
    generatedAt: new Date().toISOString(),
    modelUsed: 'llama3',
    sections: [
      { id: 'a', title: 'Letter of Transmittal', cover: 'technical', source: 'model', content: '**Dear Sir**,\n- item [___]' },
      { id: 'b', title: 'Price Bid', cover: 'financial', source: 'template', content: 'Rate [___]% below' },
    ],
  };
  const buffer = await Packer.toBuffer(buildCoverDocument(bid, 'technical', '41/EE/2026', 'Acme Infra'));
  const { value: text } = await mammoth.extractRawText({ buffer });
  assert.match(text, /Cover I: Technical Bid/);
  assert.match(text, /Letter of Transmittal/);
  assert.match(text, /Dear Sir/);
  assert.doesNotMatch(text, /\*\*/);
  assert.doesNotMatch(text, /Price Bid/);
});
