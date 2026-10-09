'use client';

/**
 * Layout for signed-in pages: requires a session (proxy.ts enforces it server-side)
 * and a completed onboarding.
 */

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import TopBar from '@/components/dashboard/TopBar';
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
        <Spinner size="lg" className="text-forest" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper">
      <TopBar />
      <main>{children}</main>
    </div>
  );
}
