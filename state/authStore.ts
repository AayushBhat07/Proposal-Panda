'use client';

import { create } from 'zustand';
import type { User } from '@/types/user.types';
import { can, type Permission } from '@/lib/auth/rbac';
import * as authClient from '@/features/auth/services/authClient';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: Permission) => boolean;
}

let pendingInit: Promise<void> | null = null;
// Bumped by login/logout so a slower /api/auth/me response can't overwrite a newer state.
let authVersion = 0;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  initialize: () => {
    // Many components mount useAuth at once; share one /api/auth/me request.
    const version = authVersion;
    pendingInit ??= authClient
      .fetchCurrentUser()
      .catch(() => null)
      .then(user => {
        if (version === authVersion) set({ user, isAuthenticated: !!user, isLoading: false });
      })
      .finally(() => (pendingInit = null));
    return pendingInit;
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const user = await authClient.login(email, password);
      authVersion++;
      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    await authClient.logout();
    authVersion++;
    set({ user: null, isAuthenticated: false });
  },

  can: permission => can(get().user?.role, permission),
}));
