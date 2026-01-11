/**
 * Phase 5A: Onboarding Types
 * Defines company profile and onboarding state
 */

export interface CompanyProfile {
  legalName: string;
  registrationClass: string;
  gstin: string;
  panNumber: string;
  registeredAddress: string;
}

export interface OnboardingState {
  companyProfile: CompanyProfile | null;
  selectedRole: 'Senior Tender Analyst' | 'Bid Writer' | 'Legal Compliance Officer' | 'Executive' | null;
  isComplete: boolean;
}
