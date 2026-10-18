'use client';

/**
 * The office's company file and whether setup is done, from the shared database.
 * Loaded once someone is signed in; saves go straight to the server.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { CompanyProfile, OnboardingState } from '@/types/onboarding.types';
import { useAuthStore } from '@/state/authStore';
import { fetchCompany, saveCompany } from '@/lib/data/api';
import { importBrowserData } from '@/lib/data/browserImport';

interface OnboardingContextValue extends OnboardingState {
  /** False until the company file has been read for the signed-in user; don't redirect before then. */
  isLoaded: boolean;
  /** Why the last save failed, if it did. */
  saveError: string | null;
  setCompanyProfile: (profile: CompanyProfile) => void;
  completeOnboarding: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

const EMPTY: OnboardingState = { companyProfile: null, isComplete: false };

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const user = useAuthStore(s => s.user);
  const authLoading = useAuthStore(s => s.isLoading);
  const [state, setState] = useState<OnboardingState>(EMPTY);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const latest = useRef(state);
  // Saves go one after another, so a quick profile save then "finish" can't land out of order.
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  useEffect(() => {
    if (!user) return;
    let alive = true;
    // Anything this browser stored before the database goes in first, so the file read next includes it.
    importBrowserData()
      .catch(() => {})
      .then(fetchCompany)
      .then(
        loaded => {
          if (!alive) return;
          latest.current = loaded;
          setState(loaded);
          setLoadedFor(user.email);
        },
        () => alive && setLoadedFor(user.email)
      );
    return () => {
      alive = false;
    };
  }, [user]);

  const persist = useCallback((next: OnboardingState) => {
    latest.current = next;
    setState(next);
    queue.current = queue.current.then(() =>
      saveCompany(next).then(
        () => setSaveError(null),
        err => setSaveError(err instanceof Error ? err.message : 'The company file did not save.')
      )
    );
  }, []);

  const setCompanyProfile = useCallback(
    (profile: CompanyProfile) => persist({ ...latest.current, companyProfile: profile }),
    [persist]
  );
  const completeOnboarding = useCallback(() => persist({ ...latest.current, isComplete: true }), [persist]);

  const isLoaded = !authLoading && (!user || loadedFor === user.email);
  const value = user ? state : EMPTY;

  return (
    <OnboardingContext.Provider value={{ ...value, isLoaded, saveError, setCompanyProfile, completeOnboarding }}>
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
