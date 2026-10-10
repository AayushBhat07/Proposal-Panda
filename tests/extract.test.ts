import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { PDFDocument, StandardFonts } from 'pdf-lib';
import { extractPdfText, extractTextFromDocx, UnreadableDocumentError } from '../features/summarization/services/textExtractor';
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

test('rejects a .docx with no readable text instead of summarising nothing', async () => {
  const { Document, Packer, Paragraph } = await import('docx');
  const doc = new Document({ sections: [{ children: [new Paragraph('')] }] });
  const file = join(mkdtempSync(join(tmpdir(), 'docx-test-')), 'empty.docx');
  writeFileSync(file, await Packer.toBuffer(doc));

  await assert.rejects(extractTextFromDocx(file), UnreadableDocumentError);
});

test('accepts a short but non-empty .docx such as a corrigendum', async () => {
  const { Document, Packer, Paragraph } = await import('docx');
  const doc = new Document({ sections: [{ children: [new Paragraph('Corrigendum 1: bid due date extended to 20/10/2026.')] }] });
  const file = join(mkdtempSync(join(tmpdir(), 'docx-test-')), 'short.docx');
  writeFileSync(file, await Packer.toBuffer(doc));

  assert.match(await extractTextFromDocx(file), /Corrigendum 1/);
});
