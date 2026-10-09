/**
 * Word export of one bid cover. Cover I and Cover II are separate files because they are uploaded
 * separately and prices must never appear in Cover I.
 * Section content is the light markdown the generator writes: **bold**, *italic*, "- " bullets and
 * numbered lines. Blanks stay highlighted so the contractor can find what is left to fill.
 */

import { AlignmentType, Document, Footer, HeadingLevel, Packer, PageNumber, Paragraph, TextRun } from 'docx';
import type { BidCover, FoundationBid } from '../types/bid.types';
import { splitBlanks, unwrapLines } from './draftText';

export const COVER_TITLES: Record<BidCover, string> = {
  technical: 'Cover I: Technical Bid',
  financial: 'Cover II: Financial Bid',
};

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/;

function runs(line: string): TextRun[] {
  return line
    .split(INLINE)
    .filter(Boolean)
    .flatMap(piece => {
      const bold = piece.startsWith('**') && piece.endsWith('**');
      const italics = !bold && piece.startsWith('*') && piece.endsWith('*') && piece.length > 2;
      const text = bold ? piece.slice(2, -2) : italics ? piece.slice(1, -1) : piece;
      return splitBlanks(text).map(
        part => new TextRun({ text: part.text, bold, italics, highlight: part.blank ? 'yellow' : undefined })
      );
    });
}

function paragraphs(content: string): Paragraph[] {
  return unwrapLines(content).split('\n').map(raw => {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•]\s+/.exec(line);
    if (bullet) return new Paragraph({ children: runs(line.slice(bullet[0].length)), bullet: { level: 0 } });
    const indent = /^\s+/.test(line) ? { left: 360 } : undefined;
    return new Paragraph({ children: runs(line.trim()), indent, spacing: { after: 80 } });
  });
}

export function buildCoverDocument(bid: FoundationBid, cover: BidCover, nitRef: string, companyName: string): Document {
  const sections = bid.sections.filter(section => section.cover === cover);
  return new Document({
    creator: companyName,
    title: `${COVER_TITLES[cover]}: ${bid.tenderTitle}`,
    styles: {
      default: {
        document: { run: { font: 'Times New Roman', size: 24 } },
        title: { run: { font: 'Times New Roman', size: 36, bold: true, color: '000000' } },
        heading1: { run: { font: 'Times New Roman', size: 28, bold: true, color: '000000' }, paragraph: { spacing: { after: 160 } } },
      },
    },
    sections: [
      {
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ children: [`${COVER_TITLES[cover]} · Page `, PageNumber.CURRENT] })],
              }),
            ],
          }),
        },
        children: [
          new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun(COVER_TITLES[cover])] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: bid.tenderTitle, bold: true })] }),
          new Paragraph({ alignment: AlignmentType.CENTER, children: runs(`NIT No. ${nitRef}`) }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 400 }, children: [new TextRun(`Submitted by ${companyName}`)] }),
          ...sections.flatMap((section, index) => [
            new Paragraph({ heading: HeadingLevel.HEADING_1, pageBreakBefore: index > 0, children: [new TextRun(section.title)] }),
            ...paragraphs(section.content),
          ]),
        ],
      },
    ],
  });
}

export function coverToBlob(...args: Parameters<typeof buildCoverDocument>): Promise<Blob> {
  return Packer.toBlob(buildCoverDocument(...args));
}
