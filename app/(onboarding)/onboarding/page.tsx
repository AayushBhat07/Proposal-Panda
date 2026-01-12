'use client';

/**
 * Phase 5B: Onboarding Page
 * Multi-step onboarding flow
 * Enhanced with state restoration and navigation safety
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import CompanyInfoForm from '@/components/onboarding/CompanyInfoForm';
import RoleSelector from '@/components/onboarding/RoleSelector';
import OnboardingSummary from '@/components/onboarding/OnboardingSummary';

export default function OnboardingPage() {
  const router = useRouter();
  const { companyProfile, selectedRole, isComplete, setCompanyProfile, setSelectedRole, completeOnboarding } =
    useOnboarding();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Check if already completed
  useEffect(() => {
    if (isComplete) {
      router.push('/dashboard');
    }
  }, [isComplete, router]);

  // Restore step based on saved state
  useEffect(() => {
    if (companyProfile && !selectedRole) {
      setStep(2);
    } else if (companyProfile && selectedRole) {
      setStep(3);
    }
  }, [companyProfile, selectedRole]);

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
    // Small delay to ensure localStorage is updated
    setTimeout(() => {
      router.push('/dashboard');
    }, 100);
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
