'use client';

/**
 * Layout for signed-in pages: requires a session (proxy.ts enforces it server-side)
 * and a completed onboarding.
 */

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import MarketTicker from '@/components/dashboard/MarketTicker';
import Spinner from '@/components/ui/Spinner';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { useAuth } from '@/features/auth/hooks/useAuth';

export default function MainLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { isComplete, isLoaded } = useOnboarding();
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (isLoading || !isLoaded) return;
    if (!isAuthenticated) router.replace('/login');
    else if (!isComplete) router.replace('/onboarding');
  }, [isAuthenticated, isLoading, isComplete, isLoaded, router]);

  if (isLoading || !isLoaded || !isAuthenticated || !isComplete) {
    return (
      <div className="h-screen flex items-center justify-center">
        <Spinner size="lg" className="text-amber-900" />
      </div>
    );
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
