import { User, Role } from '@/types/user.types';
import { LoginCredentials } from '../types/auth.types';
import { mockDelay } from '@/lib/utils/delays';
import { getFromLocalStorage, setLocalStorage } from '@/services/storage/mockStorageService';

/**
 * Mock authentication service
 * Always succeeds with demo user
 * Supports role switching for demo purposes
 */

const MOCK_ROLES: Record<Role['name'], Role> = {
  Admin: {
    id: 'role-admin',
    name: 'Admin',
    permissions: ['*'] // All permissions
  },
  BidWriter: {
    id: 'role-writer',
    name: 'BidWriter',
    permissions: ['tender.create', 'tender.edit', 'tender.view', 'document.upload']
  },
  Reviewer: {
    id: 'role-reviewer',
    name: 'Reviewer',
    permissions: ['tender.view', 'tender.review', 'annotation.create']
  },
  Executive: {
    id: 'role-executive',
    name: 'Executive',
    permissions: ['tender.view', 'dashboard.view', 'analytics.view']
  },
  ExternalConsultant: {
    id: 'role-consultant',
    name: 'ExternalConsultant',
    permissions: ['tender.view', 'annotation.create']
  }
};

/**
 * Create a mock user with specified role
 */
function createMockUser(email: string, roleName: Role['name'] = 'BidWriter'): User {
  return {
    id: 'mock-user-1',
    email,
    name: 'Demo User',
    role: MOCK_ROLES[roleName],
    organizationId: 'org-1'
  };
}

/**
 * Mock login - always succeeds
 */
export async function login(credentials: LoginCredentials): Promise<User> {
  await mockDelay(800);
  
  // Create mock user
  const user = createMockUser(credentials.email);
  
  // Save to localStorage
  setLocalStorage('currentUser', user);
  
  return user;
}

/**
 * Mock logout
 */
export async function logout(): Promise<void> {
  await mockDelay(300);
  setLocalStorage('currentUser', null);
}

/**
 * Get current user from localStorage
 */
export function getCurrentUser(): User | null {
  const user = getFromLocalStorage<User>('currentUser');
  return user;
}

/**
 * Switch user role (for demo purposes)
 */
export function switchRole(roleName: Role['name']): User | null {
  const user = getCurrentUser();
  
  if (!user) {
    console.warn('No user found to switch role');
    return null;
  }
  
  // Update role
  user.role = MOCK_ROLES[roleName];
  
  // Save back to localStorage
  setLocalStorage('currentUser', user);
  
  return user;
}

/**
 * Check if user has permission
 */
export function hasPermission(permission: string): boolean {
  const user = getCurrentUser();
  
  if (!user) return false;
  
  // Admin has all permissions
  if (user.role.permissions.includes('*')) return true;
  
  return user.role.permissions.includes(permission);
}

/**
 * Initialize with a default user if none exists
 */
export function initializeAuth(): User {
  let user = getCurrentUser();
  
  if (!user) {
    // Create default user
    user = createMockUser('demo@example.com', 'BidWriter');
    setLocalStorage('currentUser', user);
  }
  
  return user;
}
