'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import Spinner from '@/components/ui/Spinner';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const { isComplete: isOnboardingComplete, isLoaded } = useOnboarding();

  useEffect(() => {
    if (isLoading || !isLoaded) return;
    if (!isAuthenticated) router.replace('/login');
    else router.replace(isOnboardingComplete ? '/dashboard' : '/onboarding');
  }, [isAuthenticated, isLoading, isLoaded, isOnboardingComplete, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Spinner size="lg" className="text-blue-600" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
