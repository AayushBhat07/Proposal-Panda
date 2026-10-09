/**
 * Standard proformas found in CPWD / state PWD two-bid tenders.
 * Filled from the company profile; anything the contractor must supply stays a [placeholder].
 * Form names vary between departments, so these follow the common CPWD wording, not one tender.
 */

import type { CompanyProfile } from '@/types/onboarding.types';
import type { BidSection } from '../types/bid.types';

interface TemplateInput {
  /** NIT reference as printed on the tender, or a placeholder */
  nitRef: string;
  tenderTitle: string;
  company: CompanyProfile;
}

const today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function documentChecklist({ company }: TemplateInput): string {
  return [
    'Upload as one PDF in this order, unless the NIT specifies another order:',
    '',
    '1. EMD / Bid Security (scanned DD, BG, FDR or online receipt) or Bid Security Declaration where permitted [attach]',
    '2. Tender fee / e-processing fee receipt [attach]',
    `3. GST registration certificate (GSTIN ${company.gstin}) [attach]`,
    `4. PAN card (${company.panNumber}) [attach]`,
    '5. EPF and ESI registration [attach]',
    `6. Contractor registration with Government department (${company.registrationClass}) [attach]`,
    '7. Financial information: turnover for the last 5 years, CA certified with UDIN [attach]',
    '8. Solvency certificate from a scheduled bank or net worth certificate from a CA [attach]',
    '9. Details of similar works completed, with completion certificates [attach]',
    '10. Performance reports of works executed [attach]',
    '11. Works in hand / under execution (for bid capacity) [attach]',
    '12. Structure and organisation, key technical staff, plant and machinery [attach]',
    '13. Affidavit: not blacklisted or debarred [attach]',
    '14. Declaration of site inspection [attach]',
    '15. Letter of transmittal and tender acceptance letter (signed) [attach]',
    '16. Integrity Pact, signed, if required by the NIT [attach]',
  ].join('\n');
}

export function declarations({ company, nitRef, tenderTitle }: TemplateInput): string {
  return [
    '**Tender Acceptance Letter**',
    '',
    `We, ${company.legalName}, have read all the terms and conditions of NIT No. ${nitRef} (${tenderTitle}), including the`,
    'NIT, general and special conditions, specifications, drawings and BOQ, and accept them unconditionally.',
    'We confirm that our bid shall remain valid for the period stated in the NIT.',
    '',
    '**Declaration of Site Inspection**',
    '',
    'We have inspected the site of work and acquainted ourselves with site conditions, access, availability of',
    'materials, water and power, and have taken these into account in our bid. Date of inspection: [dd/mm/yyyy].',
    '',
    '**Affidavit (on non-judicial stamp paper of value [₹ ___], duly notarised)**',
    '',
    `I, [name of authorised signatory], [designation] of ${company.legalName}, do hereby solemnly affirm that the`,
    'firm has not been blacklisted, debarred or suspended by any Central/State Government department, PSU or',
    'local body, and that all information and documents submitted with this bid are true and correct.',
    'If any information is found false, the EMD may be forfeited and the firm may be debarred.',
    '',
    `Place: [city]    Date: ${today()}`,
    'Signature and seal of the bidder',
  ].join('\n');
}

export function bidCapacity(): string {
  return [
    'Assessed available bid capacity = (A × N × 2) − B, where:',
    '',
    '- **A** = maximum value of civil works executed in any one year during the last 5 years, updated to the current',
    '  price level at 7% per year (from audited, CA-certified figures): ₹ [___]',
    '- **N** = number of years prescribed for completion of this work: [___]',
    '- **B** = value at current price level of existing commitments and works in hand to be completed within N: ₹ [___]',
    '',
    'Bid capacity = ([A] × [N] × 2) − [B] = ₹ [___], which must be at least the estimated cost put to tender.',
    '',
    '**Similar works completed in the last 7 years** (as defined in the NIT)',
    '',
    '1. [Name of work], [client], ₹ [value], [start date] to [completion date], certificate attached: [yes/no]',
    '2. [Name of work], [client], ₹ [value], [start date] to [completion date], certificate attached: [yes/no]',
    '3. [Name of work], [client], ₹ [value], [start date] to [completion date], certificate attached: [yes/no]',
  ].join('\n');
}

export function financialBid({ company, nitRef, tenderTitle }: TemplateInput): string {
  return [
    `**Financial Bid (Cover II) for NIT No. ${nitRef}: ${tenderTitle}**`,
    '',
    'Fill in the BOQ / percentage-rate sheet on the e-procurement portal. Do not reveal prices anywhere in Cover I,',
    'or the bid may be rejected.',
    '',
    '*If percentage rate tender:*',
    '',
    `We, ${company.legalName}, offer to execute the work at [___]% [below / above / at par] the estimated cost put to`,
    'tender of ₹ [___], inclusive of all taxes, duties, royalties, labour cess and incidental charges, as per the',
    'tender conditions. A blank or nil quote makes the bid invalid.',
    '',
    '*If item rate tender:* quote a rate in figures and words for every BOQ item. Unquoted items are taken as zero.',
    '',
    '**Before quoting, check:**',
    '- GST treatment of quoted rates (inclusive or extra) as the NIT states',
    '- Price variation / escalation clause, if any',
    '- Royalty, labour cess, testing charges and insurance included in rates',
    '- Rebate offered, if allowed (only in the format the portal provides)',
  ].join('\n');
}

export const TEMPLATE_SECTIONS: Array<Omit<BidSection, 'content'> & { render: (input: TemplateInput) => string }> = [
  { id: 'document-checklist', title: 'Document Checklist', cover: 'technical', source: 'template', render: documentChecklist },
  { id: 'declarations', title: 'Tender Acceptance Letter, Site Inspection and Affidavit', cover: 'technical', source: 'template', render: declarations },
  { id: 'bid-capacity', title: 'Eligibility: Similar Works and Bid Capacity', cover: 'technical', source: 'template', render: bidCapacity },
  { id: 'financial-bid', title: 'Price Bid', cover: 'financial', source: 'template', render: financialBid },
];
