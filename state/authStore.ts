'use client';

import { create } from 'zustand';
import { User, Role } from '@/types/user.types';
import * as authService from '@/features/auth/services/mockAuthService';

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  initialize: () => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: Role['name']) => void;
  refreshUser: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  
  initialize: () => {
    try {
      const user = authService.initializeAuth();
      set({ 
        user, 
        isAuthenticated: !!user,
        isLoading: false 
      });
    } catch (error) {
      console.error('Error initializing auth:', error);
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    }
  },
  
  login: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const user = await authService.login({ email, password });
      set({ 
        user, 
        isAuthenticated: true,
        isLoading: false 
      });
    } catch (error) {
      console.error('Login error:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      set({ 
        user: null, 
        isAuthenticated: false,
        isLoading: false 
      });
    } catch (error) {
      console.error('Logout error:', error);
      set({ isLoading: false });
      throw error;
    }
  },
  
  switchRole: (role: Role['name']) => {
    try {
      const updatedUser = authService.switchRole(role);
      if (updatedUser) {
        set({ user: updatedUser });
      }
    } catch (error) {
      console.error('Error switching role:', error);
    }
  },
  
  refreshUser: () => {
    try {
      const user = authService.getCurrentUser();
      set({ 
        user, 
        isAuthenticated: !!user 
      });
    } catch (error) {
      console.error('Error refreshing user:', error);
      set({ 
        user: null, 
        isAuthenticated: false 
      });
    }
  }
}));
