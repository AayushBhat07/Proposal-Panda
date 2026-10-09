'use client';

/**
 * Phase 5B: Onboarding Page
 * Multi-step onboarding flow
 * Enhanced with state restoration and navigation safety
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import CompanyInfoForm from '@/components/onboarding/CompanyInfoForm';
import OnboardingSummary from '@/components/onboarding/OnboardingSummary';

export default function OnboardingPage() {
  const router = useRouter();
  const { companyProfile, isComplete, setCompanyProfile, completeOnboarding } = useOnboarding();
  useAuth(); // loads the signed-in user shown on the review step
  const [step, setStep] = useState<1 | 2>(1);

  // Check if already completed
  useEffect(() => {
    if (isComplete) {
      router.push('/dashboard');
    }
  }, [isComplete, router]);

  // Restore step based on saved state
  useEffect(() => {
    if (companyProfile) {
      setStep(2);
    }
  }, [companyProfile]);

  const handleCompanyInfoNext = (profile: typeof companyProfile) => {
    setCompanyProfile(profile!);
    setStep(2);
  };

  const handleComplete = () => {
    completeOnboarding();
    // Small delay to ensure localStorage is updated
    setTimeout(() => {
      router.push('/dashboard');
    }, 100);
  };

  const handleBack = () => {
    setStep(1);
  };

  return (
    <OnboardingLayout currentStep={step}>
      {step === 1 && (
        <CompanyInfoForm onNext={handleCompanyInfoNext} initialData={companyProfile} />
      )}
      {step === 2 && companyProfile && (
        <OnboardingSummary
          companyProfile={companyProfile}
          onBack={handleBack}
          onComplete={handleComplete}
        />
      )}
    </OnboardingLayout>
  );
}
