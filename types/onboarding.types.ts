/**
 * The contractor's company file: filled once at onboarding, used to fill the proformas in every bid.
 * Everything beyond the first three fields is optional, so profiles saved before these fields existed
 * still load, and a bid leaves a [placeholder] wherever a value is missing.
 */

export const CONSTITUTIONS = [
  'Proprietorship',
  'Partnership firm',
  'Limited liability partnership',
  'Private limited company',
  'Public limited company',
] as const;

/** Amounts are in ₹ lakh, the unit Indian tenders and CA certificates use. */
export interface TurnoverYear {
  /** Financial year as "2025-26" */
  year: string;
  lakh: number | null;
}

export interface SimilarWork {
  name: string;
  client: string;
  valueLakh: number | null;
  /** mm/yyyy, as completion certificates print them */
  start: string;
  completion: string;
}

export interface KeyStaff {
  name: string;
  qualification: string;
  years: number | null;
}

export interface CompanyProfile {
  legalName: string;
  registrationClass: string;
  /** Kept in the encrypted vault now; only profiles saved before the vault existed still carry these. */
  gstin?: string;
  panNumber?: string;
  registeredAddress: string;

  constitution?: string;
  yearEstablished?: string;
  /** Department the contractor is enlisted with, e.g. CPWD or HP PWD */
  registrationAuthority?: string;
  registrationNumber?: string;
  registrationValidUpto?: string;
  signatoryName?: string;
  signatoryDesignation?: string;
  contactEmail?: string;
  contactPhone?: string;

  /** Most recent year first */
  turnover?: TurnoverYear[];
  solvencyLakh?: number | null;
  /** Value of works in hand still to be done: B in the bid capacity formula */
  worksInHandLakh?: number | null;

  similarWorks?: SimilarWork[];
  keyStaff?: KeyStaff[];
  machinery?: string;
}

export interface OnboardingState {
  companyProfile: CompanyProfile | null;
  isComplete: boolean;
}
