/**
 * Joins vault documents into the single PDF most tender portals ask for. PDFs are copied page by page;
 * PNG and JPEG scans each go on an A4 page, scaled to fit. Runs in the browser, so nothing is uploaded.
 */

import { PDFDocument } from 'pdf-lib';

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 28;

export async function buildBundle(files: Array<{ bytes: Uint8Array; type: string }>): Promise<Uint8Array> {
  const bundle = await PDFDocument.create();
  for (const { bytes, type } of files) {
    if (type === 'application/pdf') {
      const source = await PDFDocument.load(bytes);
      const pages = await bundle.copyPages(source, source.getPageIndices());
      pages.forEach(page => bundle.addPage(page));
      continue;
    }
    const image = type === 'image/png' ? await bundle.embedPng(bytes) : await bundle.embedJpg(bytes);
    const page = bundle.addPage(A4);
    const scale = Math.min((A4[0] - 2 * MARGIN) / image.width, (A4[1] - 2 * MARGIN) / image.height, 1);
    const width = image.width * scale;
    const height = image.height * scale;
    page.drawImage(image, { x: (A4[0] - width) / 2, y: (A4[1] - height) / 2, width, height });
  }
  return bundle.save();
}
