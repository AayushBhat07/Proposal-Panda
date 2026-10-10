import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractPdfText } from '../features/summarization/services/textExtractor';
import { findEmdAmount, findNitReference } from '../features/summarization/services/summarizer';

test('keeps the line breaks of a text PDF so label-value rows stay readable', async () => {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.addPage([595, 842]);
  ['NOTICE INVITING TENDER', 'NIT No: 50/Civil/D1/2026-27', 'Earnest Money Deposit (Rs.) : Rs. 33446/-'].forEach((line, i) =>
    page.drawText(line, { x: 50, y: 780 - i * 20, size: 11, font })
  );
  doc.addPage([595, 842]).drawText('Second page', { x: 50, y: 780, size: 11, font });
  const file = join(mkdtempSync(join(tmpdir(), 'pdf-test-')), 'nit.pdf');
  writeFileSync(file, await doc.save());

  const text = await extractPdfText(file);
  assert.match(text, /NIT No: 50\/Civil\/D1\/2026-27\n/);
  assert.match(text, /\n\nSecond page$/);
  assert.equal(findNitReference(text), '50/Civil/D1/2026-27');
  assert.equal(findEmdAmount(text), 'Rs. 33446');
});
