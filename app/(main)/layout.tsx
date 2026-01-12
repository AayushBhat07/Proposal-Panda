'use client';

/**
 * Phase 5B: Main Layout
 * Layout for authenticated pages with sidebar and top bar
 * Enhanced with navigation safety and onboarding checks
 */

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import MarketTicker from '@/components/dashboard/MarketTicker';
import { useOnboarding } from '@/lib/context/OnboardingContext';

export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isComplete } = useOnboarding();

  // Navigation safety: redirect to onboarding if not complete
  useEffect(() => {
    if (!isComplete) {
      router.push('/onboarding');
    }
  }, [isComplete, router]);

  // Don't render layout if onboarding incomplete
  if (!isComplete) {
    return null;
  }

  return (
    <div className="h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
      <MarketTicker />
    </div>
  );
}
