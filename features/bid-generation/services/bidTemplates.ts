/**
 * Standard proformas found in Indian two-bid tenders: CPWD / state PWD works, and goods (GeM / store purchase) and
 * services (manpower, security, O&M) tenders that use the same technical-bid / price-bid split.
 * Filled from the company profile; anything the bidder must supply stays a [placeholder].
 * Form names vary between departments, so these follow the common wording, not one tender.
 */

import type { CompanyProfile } from '@/types/onboarding.types';
import type { BidSection } from '../types/bid.types';

export type TenderKind = 'works' | 'supply' | 'services';

interface TemplateInput {
  /** NIT reference as printed on the tender, or a placeholder */
  nitRef: string;
  tenderTitle: string;
  company: CompanyProfile;
  /** Defaults to works */
  kind?: TenderKind;
}

const today = () => new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const KIND_CHECKLIST: Record<TenderKind, (company: CompanyProfile) => string[]> = {
  works: company => [
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
  ],
  supply: () => [
    '5. MSE / Udyam registration, if claiming EMD or other exemptions [attach]',
    '6. OEM authorisation (manufacturer\'s authorisation form), if the bidder is not the OEM [attach]',
    '7. Financial information: turnover for the years the bid document asks, CA certified with UDIN [attach]',
    '8. Past supply orders of similar items with completion / installation certificates [attach]',
    '9. Technical compliance sheet: each specification in the bid document against the offered make and model [attach]',
    '10. Product datasheets, brochures and certificates the bid document asks for (BIS, ISO, test reports) [attach]',
    '11. Make in India / local content declaration, where required [attach]',
    '12. Affidavit: not blacklisted or debarred [attach]',
  ],
  services: () => [
    '5. EPF and ESI registration, and labour licence under the CLRA Act where applicable [attach]',
    '6. Licences specific to the service the bid document asks for (e.g. PSARA licence for security agencies) [attach]',
    '7. Financial information: turnover for the years the bid document asks, CA certified with UDIN [attach]',
    '8. Past orders for similar services with satisfactory performance certificates [attach]',
    '9. Manpower deployment and supervision plan [attach]',
    '10. Quality certificates the bid document asks for (e.g. ISO 9001) [attach]',
    '11. Affidavit: not blacklisted or debarred [attach]',
  ],
};

export function documentChecklist({ company, kind = 'works' }: TemplateInput): string {
  const items = [
    '1. EMD / Bid Security (scanned DD, BG, FDR or online receipt) or Bid Security Declaration where permitted [attach]',
    '2. Tender fee / e-processing fee receipt [attach]',
    `3. GST registration certificate (GSTIN ${company.gstin}) [attach]`,
    `4. PAN card (${company.panNumber}) [attach]`,
    ...KIND_CHECKLIST[kind](company),
    'Letter of transmittal and tender acceptance letter (signed) [attach]',
    'Integrity Pact, signed, if required by the NIT [attach]',
  ];
  return [
    'Upload as one PDF in this order, unless the NIT specifies another order:',
    '',
    ...items.map((item, i) => item.replace(/^(?:\d+\.\s*)?/, `${i + 1}. `)),
  ].join('\n');
}

export function declarations({ company, nitRef, tenderTitle, kind = 'works' }: TemplateInput): string {
  return [
    '**Tender Acceptance Letter**',
    '',
    `We, ${company.legalName}, have read all the terms and conditions of NIT No. ${nitRef} (${tenderTitle}), including the`,
    kind === 'works'
      ? 'NIT, general and special conditions, specifications, drawings and BOQ, and accept them unconditionally.'
      : 'NIT / bid document, general and special conditions, specifications and price schedule, and accept them unconditionally.',
    'We confirm that our bid shall remain valid for the period stated in the NIT.',
    '',
    ...(kind === 'works'
      ? [
          '**Declaration of Site Inspection**',
          '',
          'We have inspected the site of work and acquainted ourselves with site conditions, access, availability of',
          'materials, water and power, and have taken these into account in our bid. Date of inspection: [dd/mm/yyyy].',
          '',
        ]
      : []),
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

/** Eligibility proforma for goods and services tenders: past orders and turnover instead of bid capacity. */
export function pastExperience({ kind = 'supply' }: TemplateInput): string {
  const noun = kind === 'services' ? 'services' : 'supplies';
  return [
    `**Similar ${noun} completed in the period the bid document specifies**`,
    '',
    `1. [Order / contract no.], [buyer], [description of ${noun}], ₹ [value], [order date] to [completion date], performance certificate attached: [yes/no]`,
    `2. [Order / contract no.], [buyer], [description of ${noun}], ₹ [value], [order date] to [completion date], performance certificate attached: [yes/no]`,
    `3. [Order / contract no.], [buyer], [description of ${noun}], ₹ [value], [order date] to [completion date], performance certificate attached: [yes/no]`,
    '',
    '**Average annual turnover** (CA certified, for the financial years the bid document asks)',
    '',
    '- FY [____]: ₹ [___]',
    '- FY [____]: ₹ [___]',
    '- FY [____]: ₹ [___]',
    '',
    'Check each figure against the minimum the bid document sets before submitting.',
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

export function financialBid({ company, nitRef, tenderTitle, kind = 'works' }: TemplateInput): string {
  if (kind !== 'works') {
    return [
      `**Financial Bid (Price Bid) for ${nitRef}: ${tenderTitle}**`,
      '',
      'Quote in the price schedule / BOQ on the portal (on GeM, in the bid itself). Do not reveal prices anywhere in',
      'the technical bid, or the bid may be rejected.',
      '',
      `We, ${company.legalName}, offer the ${kind === 'services' ? 'services' : 'items'} at the rates entered in the price schedule, as per the`,
      'specifications, quantities and terms of the bid document.',
      '',
      '**Before quoting, check:**',
      '- GST treatment of quoted rates (inclusive or extra) as the bid document states',
      kind === 'services'
        ? '- Minimum wages, EPF/ESI, bonus and other statutory payments built into the manpower rate, and how revisions are paid'
        : '- Freight, insurance, installation, commissioning and warranty included in the unit price as the bid document states',
      '- Delivery / contract period and the liquidated damages or penalties for delay',
      '- Payment terms and any price variation or rate revision clause',
    ].join('\n');
  }
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
  { id: 'past-experience', title: 'Eligibility: Past Orders and Turnover', cover: 'technical', source: 'template', render: pastExperience },
  { id: 'financial-bid', title: 'Price Bid', cover: 'financial', source: 'template', render: financialBid },
];
