'use client';

/**
 * Phase 5A: Onboarding Context
 * Manages onboarding state with localStorage persistence
 */

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import type { CompanyProfile, OnboardingState } from '@/types/onboarding.types';

interface OnboardingContextValue extends OnboardingState {
  /** False until localStorage has been read; don't redirect before then. */
  isLoaded: boolean;
  setCompanyProfile: (profile: CompanyProfile) => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>({
    companyProfile: null,
    isComplete: false,
  });
  const [isLoaded, setIsLoaded] = useState(false);

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
    setIsLoaded(true);
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    if (isLoaded) localStorage.setItem('onboardingState', JSON.stringify(state));
  }, [state, isLoaded]);

  const setCompanyProfile = (profile: CompanyProfile) => {
    setState(prev => ({ ...prev, companyProfile: profile }));
  };

  const completeOnboarding = () => {
    setState(prev => ({ ...prev, isComplete: true }));
  };

  return (
    <OnboardingContext.Provider
      value={{
        ...state,
        isLoaded,
        setCompanyProfile,
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
