/**
 * Phase 5A: Onboarding Types
 * Defines company profile and onboarding state
 */

export interface CompanyProfile {
  legalName: string;
  registrationClass: string;
  /** Kept in the encrypted vault now; only profiles saved before the vault existed still carry these. */
  gstin?: string;
  panNumber?: string;
  registeredAddress: string;
}

export interface OnboardingState {
  companyProfile: CompanyProfile | null;
  isComplete: boolean;
}
