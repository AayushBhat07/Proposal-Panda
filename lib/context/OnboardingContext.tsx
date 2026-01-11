'use client';

/**
 * Phase 5A: Onboarding Context
 * Manages onboarding state with localStorage persistence
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CompanyProfile, OnboardingState } from '@/types/onboarding.types';

interface OnboardingContextValue extends OnboardingState {
  setCompanyProfile: (profile: CompanyProfile) => void;
  setSelectedRole: (role: OnboardingState['selectedRole']) => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    companyProfile: null,
    selectedRole: null,
    isComplete: false,
  });

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('onboardingState');
    if (stored) {
      try {
        setState(JSON.parse(stored));
      } catch (error) {
        console.error('Failed to load onboarding state:', error);
      }
    }
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem('onboardingState', JSON.stringify(state));
  }, [state]);

  const setCompanyProfile = (profile: CompanyProfile) => {
    setState(prev => ({ ...prev, companyProfile: profile }));
  };

  const setSelectedRole = (role: OnboardingState['selectedRole']) => {
    setState(prev => ({ ...prev, selectedRole: role }));
  };

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, isComplete: true }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        ...state,
        setCompanyProfile,
        setSelectedRole,
        completeOnboarding,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider');
  }
  return context;
}
