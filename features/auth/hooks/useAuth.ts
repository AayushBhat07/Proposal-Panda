'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/state/authStore';

/** Auth state for components; loads the current session once. */
export function useAuth() {
  const store = useAuthStore();
  const { initialize, isAuthenticated, isLoading } = store;

  useEffect(() => {
    if (isLoading && !isAuthenticated) initialize();
  }, [initialize, isAuthenticated, isLoading]);

  return store;
}
