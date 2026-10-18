/**
 * The light markdown the local models write: **bold**, *italic*, "- " bullets (nested by indent) and
 * "#" headings. Rendered as text and elements, never as HTML, so model output can't inject markup.
 */

import type { ReactNode } from 'react';

const INLINE = /(\*\*[^*\n]+\*\*|\*[^*\s][^*\n]*\*)/;

/** Bold and italic inside one line; everything else is plain text. */
export function InlineMarkdown({ text }: { text: string }) {
  return (
    <>
      {text
        .split(INLINE)
        .filter(Boolean)
        .map((piece, i) => {
          if (piece.length > 4 && piece.startsWith('**') && piece.endsWith('**'))
            return <strong key={i} className="font-semibold">{piece.slice(2, -2)}</strong>;
          if (piece.length > 2 && piece.startsWith('*') && piece.endsWith('*')) return <em key={i}>{piece.slice(1, -1)}</em>;
          return piece;
        })}
    </>
  );
}

/** Whole blocks: paragraphs, bullet lists and headings. */
export default function LightMarkdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trimEnd();
    if (!line.trim()) return;
    const bullet = /^(\s*)(?:[-•*]|\d+[.)])\s+(.*)$/.exec(line);
    const heading = /^#{1,6}\s+(.*)$/.exec(line.trim());
    if (bullet) {
      const depth = Math.min(3, Math.floor(bullet[1].replace(/\t/g, '  ').length / 2));
      blocks.push(
        <p key={i} className="relative pl-5" style={{ marginLeft: `${depth * 1.25}rem` }}>
          <span aria-hidden className="absolute left-0 text-muted">
            {depth ? '–' : '•'}
          </span>
          <InlineMarkdown text={bullet[2]} />
        </p>
      );
    } else if (heading) {
      blocks.push(
        <p key={i} className="font-semibold">
          <InlineMarkdown text={heading[1].replace(/\*\*/g, '')} />
        </p>
      );
    } else {
      blocks.push(
        <p key={i}>
          <InlineMarkdown text={line.trim()} />
        </p>
      );
    }
  });
  return <div className={`flex flex-col gap-1.5 ${className ?? ''}`}>{blocks}</div>;
}
