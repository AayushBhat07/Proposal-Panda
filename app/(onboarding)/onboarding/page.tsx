'use client';

/**
 * Phase 5A: Onboarding Page
 * Multi-step onboarding flow
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import CompanyInfoForm from '@/components/onboarding/CompanyInfoForm';
import RoleSelector from '@/components/onboarding/RoleSelector';
import OnboardingSummary from '@/components/onboarding/OnboardingSummary';

export default function OnboardingPage() {
  const router = useRouter();
  const { companyProfile, selectedRole, setCompanyProfile, setSelectedRole, completeOnboarding } =
    useOnboarding();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  const handleCompanyInfoNext = (profile: typeof companyProfile) => {
    setCompanyProfile(profile!);
    setStep(2);
  };

  const handleRoleNext = (role: typeof selectedRole) => {
    setSelectedRole(role);
    setStep(3);
  };

  const handleComplete = () => {
    completeOnboarding();
    router.push('/dashboard');
  };

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as 1 | 2 | 3);
    }
  };

  return (
    <OnboardingLayout currentStep={step}>
      {step === 1 && (
        <CompanyInfoForm onNext={handleCompanyInfoNext} initialData={companyProfile} />
      )}
      {step === 2 && (
        <RoleSelector onNext={handleRoleNext} onBack={handleBack} initialRole={selectedRole} />
      )}
      {step === 3 && companyProfile && selectedRole && (
        <OnboardingSummary
          companyProfile={companyProfile}
          selectedRole={selectedRole}
          onBack={handleBack}
          onComplete={handleComplete}
        />
      )}
    </OnboardingLayout>
  );
}
