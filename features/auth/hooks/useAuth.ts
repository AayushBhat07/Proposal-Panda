'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/state/authStore';

/**
 * Custom hook for authentication
 * Automatically initializes auth on mount
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, initialize, login, logout, switchRole, refreshUser } = useAuthStore();
  
  useEffect(() => {
    // Initialize auth on mount
    initialize();
  }, [initialize]);
  
  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    logout,
    switchRole,
    refreshUser
  };
}
