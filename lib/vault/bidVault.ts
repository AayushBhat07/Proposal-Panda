/**
 * How the bid uses the vault without the vault's contents ever leaving this computer.
 *
 * The bid is drafted with tokens in place of GSTIN and PAN, so neither the server, the model nor the stored
 * bid ever holds the real numbers. The page shows them masked, and the Word export puts the real values in
 * only at download time, from the unlocked vault.
 */

import { getAllFromLocalStorage, saveToLocalStorage } from '@/services/storage/mockStorageService';
import type { FoundationBid } from '@/features/bid-generation/types/bid.types';
import { DOCUMENT_KINDS, type DocumentKind, type Identifiers, type VaultDocument } from './vault';

export const GSTIN_TOKEN = '{GSTIN}';
export const PAN_TOKEN = '{PAN}';

/** Keeps the first 2 and last 2 characters: 07ABCDE1234F1Z5 → 07•••••••••••Z5. */
export function mask(value: string): string {
  if (value.length <= 4) return '•'.repeat(value.length);
  return value.slice(0, 2) + '•'.repeat(value.length - 4) + value.slice(-2);
}

/**
 * Replaces the tokens. With no identifiers (vault locked or empty) they read "GSTIN (in vault)", so the page
 * never shows a raw token and never shows the number.
 */
export function withIdentifiers(text: string, ids: Identifiers | null | undefined, reveal: boolean): string {
  const show = (value: string | undefined, label: string) =>
    value ? (reveal ? value : mask(value)) : `${label} (in vault)`;
  return text.split(GSTIN_TOKEN).join(show(ids?.gstin, 'GSTIN')).split(PAN_TOKEN).join(show(ids?.pan, 'PAN'));
}

export const hasIdentifierTokens = (text: string) => text.includes(GSTIN_TOKEN) || text.includes(PAN_TOKEN);

/** Which checklist line each kind of vault document satisfies (lines from bidTemplates.documentChecklist). */
const CHECKLIST_LINES: Array<[DocumentKind, RegExp]> = [
  ['gst', /GST registration certificate/i],
  ['pan', /PAN card/i],
  ['epf', /EPF and ESI/i],
  ['registration', /Contractor registration/i],
  ['turnover', /turnover/i],
  ['solvency', /Solvency/i],
  ['works', /similar works completed/i],
];

/** Lines of the document checklist that a vault document can satisfy, with the documents for each. */
export function checklistMatches(content: string, docs: VaultDocument[]): Array<{ line: string; docs: VaultDocument[] }> {
  return content.split('\n').flatMap(line => {
    if (!line.includes('[attach]')) return [];
    const kind = CHECKLIST_LINES.find(([, pattern]) => pattern.test(line))?.[0];
    const matching = kind ? docs.filter(d => d.kind === kind) : [];
    return matching.length ? [{ line, docs: matching }] : [];
  });
}

/** Marks the matched lines as attached from the vault, by document kind (file names can carry the PAN). */
export function attachFromVault(content: string, docs: VaultDocument[]): string {
  const matches = new Map(checklistMatches(content, docs).map(m => [m.line, m.docs]));
  return content
    .split('\n')
    .map(line => {
      const found = matches.get(line);
      return found ? line.replace('[attach]', `(attached from vault: ${DOCUMENT_KINDS[found[0].kind]})`) : line;
    })
    .join('\n');
}

/** Swaps real GSTIN and PAN for the tokens, for bids saved before the vault existed. */
export function scrubIdentifiers(text: string, legacy: { gstin?: string; panNumber?: string }): string {
  let out = text;
  if (legacy.gstin) out = out.split(legacy.gstin).join(GSTIN_TOKEN);
  if (legacy.panNumber) out = out.split(legacy.panNumber).join(PAN_TOKEN);
  return out;
}

/** Rewrites every stored bid that still carries the real numbers. Safe to run on each page load. */
export function scrubStoredBids(legacy: { gstin?: string; panNumber?: string }) {
  if (!legacy.gstin && !legacy.panNumber) return;
  for (const bid of getAllFromLocalStorage<FoundationBid & { id: string }>('foundationBids')) {
    const sections = bid.sections.map(s => ({ ...s, content: scrubIdentifiers(s.content, legacy) }));
    if (sections.some((s, i) => s.content !== bid.sections[i].content)) saveToLocalStorage('foundationBids', { ...bid, sections });
  }
}
