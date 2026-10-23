/**
 * Turns a vault document into page images for the Word export: PNG and JPEG scans as they are, PDFs rendered
 * page by page. Runs in the browser, so the document never leaves it.
 */

import { getDocumentProxy, renderPageAsImage } from 'unpdf';
import type { EnclosurePage } from '@/features/bid-generation/services/bidDocx';

// Twice the PDF's own size keeps certificate text sharp when printed.
const PDF_SCALE = 2;

export async function pageImages(bytes: Uint8Array, type: string): Promise<EnclosurePage[]> {
  if (type === 'application/pdf') {
    // pdf.js takes ownership of the buffer it is given, so it gets a copy.
    const pdf = await getDocumentProxy(bytes.slice());
    const pages: EnclosurePage[] = [];
    for (let n = 1; n <= pdf.numPages; n++) {
      const { width, height } = (await pdf.getPage(n)).getViewport({ scale: 1 });
      const png = await renderPageAsImage(pdf, n, { scale: PDF_SCALE });
      pages.push({ data: new Uint8Array(png), type: 'png', width, height });
    }
    return pages;
  }
  const { width, height } = await createImageBitmap(new Blob([bytes as BlobPart], { type }));
  return [{ data: bytes, type: type === 'image/png' ? 'png' : 'jpg', width, height }];
}
