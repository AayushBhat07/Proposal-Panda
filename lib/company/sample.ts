/**
 * A made-up contractor for trying the app: Himgiri Buildcon, a Class I civil contractor in Solan, sized to
 * qualify for a ₹15–20 crore building tender. Every value is fictional and every file is stamped as a
 * specimen. Offered only outside production builds.
 */

import { lastFiveYears } from '@/lib/company/profile';
import { splitBlanks } from '@/features/bid-generation/services/draftText';
import type { DocumentKind, Identifiers } from '@/lib/vault/vault';
import type { CompanyProfile } from '@/types/onboarding.types';

export const SAMPLE_DATA_ENABLED = process.env.NODE_ENV !== 'production';

const TURNOVER_LAKH = [6894, 6127, 5280, 4615, 3842];

export function sampleProfile(date = new Date()) {
  return {
    legalName: 'Himgiri Buildcon Private Limited',
    constitution: 'Private limited company',
    yearEstablished: '2011',
    registeredAddress: 'Plot 14, Industrial Area Phase II, Parwanoo, District Solan, Himachal Pradesh - 173220',
    registrationAuthority: 'CPWD',
    registrationClass: 'Class I (Civil)',
    registrationNumber: 'ENL/HP/CIV/2019/0482',
    registrationValidUpto: '2029-06-17',
    signatoryName: 'Rajesh Kumar Thakur',
    signatoryDesignation: 'Director',
    contactEmail: 'tenders@himgiri-buildcon.example',
    contactPhone: '+91 98160 00000',
    turnover: lastFiveYears(date).map((year, i) => ({ year, lakh: TURNOVER_LAKH[i] })),
    solvencyLakh: 1800,
    worksInHandLakh: 4200,
    similarWorks: [
      { name: 'Construction of Administrative Block, Government Polytechnic, Sundernagar (HP)', client: 'HP PWD', valueLakh: 2208, start: '04/2021', completion: '09/2022' },
      { name: 'Construction of G+4 Office Building for District Forest Office, Nahan (HP)', client: 'HP Forest Department', valueLakh: 1542, start: '06/2022', completion: '11/2023' },
      { name: 'Construction of 48 Type-II Staff Quarters, Baddi (HP)', client: 'CPWD, Shimla Central Division', valueLakh: 1203, start: '02/2023', completion: '07/2024' },
    ],
    keyStaff: [
      { name: 'Anil Sharma', qualification: 'B.E. Civil, project manager', years: 18 },
      { name: 'Priya Negi', qualification: 'B.Tech Civil, site engineer', years: 9 },
      { name: 'Vikas Chauhan', qualification: 'Diploma Civil, quality control', years: 12 },
      { name: 'Sunil Verma', qualification: 'B.Tech Electrical, E&M engineer', years: 10 },
    ],
    machinery: [
      'Concrete batching plant 30 cum/hr (owned)',
      'Tower crane 6 t (leased)',
      'Transit mixers 6 cum, 3 nos. (owned)',
      'Hydraulic excavator 0.9 cum (owned)',
      'Steel props and shuttering for 2,000 sqm (owned)',
    ].join('\n'),
  } satisfies CompanyProfile;
}

export const SAMPLE_IDENTIFIERS: Identifiers = { gstin: '02AAHCH4821K1Z5', pan: 'AAHCH4821K' };

export const SAMPLE_PASSPHRASE = 'granite ladder monsoon teacup';

/** Served from /public/sample-contractor. */
export const SAMPLE_DOCUMENTS: Array<{ kind: DocumentKind; file: string }> = [
  { kind: 'gst', file: '01-gst-registration-certificate.pdf' },
  { kind: 'pan', file: '02-pan-card.png' },
  { kind: 'epf', file: '03-epf-esi-registration.pdf' },
  { kind: 'registration', file: '04-contractor-registration-class-I.pdf' },
  { kind: 'turnover', file: '05-turnover-certificate-CA.pdf' },
  { kind: 'solvency', file: '06-solvency-certificate.pdf' },
  { kind: 'works', file: '07-work-completion-certificate-1.pdf' },
  { kind: 'works', file: '07-work-completion-certificate-2.pdf' },
  { kind: 'works', file: '07-work-completion-certificate-3.pdf' },
  { kind: 'works', file: '07-work-completion-certificate-1-scan.jpg' },
  { kind: 'other', file: '08-company-logo.png' },
];

/** Specimen answers for bid blanks, first match wins; the patterns are the blanks bidTemplates leaves. */
const SAMPLE_BLANKS: Array<[RegExp, (p: ReturnType<typeof sampleProfile>, today: string) => string]> = [
  [/start date|order date/i, p => p.similarWorks[0].start],
  [/completion date/i, p => p.similarWorks[0].completion],
  [/dd\/mm\/yyyy|date/i, (_, today) => today],
  [/name of authorised signatory|^\[name\]$/i, p => p.signatoryName],
  [/^\[designation\]$/i, p => p.signatoryDesignation],
  [/designation of the tender inviting/i, () => 'Executive Engineer'],
  [/division and address|address as per nit/i, () => 'Executive Engineer, Shimla Central Division, CPWD, Nirman Bhawan, Shimla - 171001'],
  [/nit no/i, () => '07/EE/SCD/CPWD/2026-27'],
  [/city/i, () => 'Parwanoo'],
  [/name of work/i, p => p.similarWorks[0].name],
  [/client|buyer/i, p => p.similarWorks[0].client],
  [/order \/ contract no/i, () => 'SCD/CPWD/2023/118'],
  [/^\[(value|insert value)\]$/i, p => `₹ ${p.similarWorks[0].valueLakh} lakh`],
  [/₹/, () => '₹ 5,00,000'],
  [/yes\/no/i, () => 'Yes'],
  [/below \/ above \/ at par/i, () => 'below'],
  [/annexure/i, () => 'Annexure A'],
  [/registration certificates/i, p => `${p.registrationClass}, ${p.registrationAuthority} ${p.registrationNumber}`],
  [/to be listed/i, p => p.machinery.split('\n')[0]],
  [/concrete grade/i, () => 'M25'],
  [/steel grade/i, () => 'Fe 500D'],
  [/is code/i, () => 'IS 456:2000'],
  [/flooring/i, () => 'vitrified tiles'],
  [/finish/i, () => 'acrylic emulsion paint'],
  [/waterproofing/i, () => 'integral crystalline waterproofing compound'],
  [/electrical equipment/i, () => 'LED luminaires and MCB distribution boards'],
  [/make \/ model/i, () => 'Schwing Stetter CP30'],
  [/period/i, () => '12 months'],
  [/qualification/i, p => p.keyStaff[0].qualification],
  [/number/i, () => '4'],
  [/activities/i, () => 'excavation, foundations, RCC frame, finishing'],
];

/**
 * Fills every blank with the sample contractor's details, for trying a bid end to end. [attach] lines are left
 * for the vault, and model flags ([Edit needed: …]) and single letters are left for a person.
 */
export function fillSampleBlanks(text: string, date = new Date()): string {
  const profile = sampleProfile(date);
  const today = date.toLocaleDateString('en-GB');
  return splitBlanks(text)
    .map(({ text: part, blank }) => {
      if (!blank || part === '[attach]' || /^\[(edit needed|[a-z]\])/i.test(part)) return part;
      return SAMPLE_BLANKS.find(([pattern]) => pattern.test(part))?.[1](profile, today) ?? 'Specimen';
    })
    .join('');
}
