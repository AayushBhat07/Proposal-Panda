'use client';

import Link from 'next/link';
import { useAuth } from '@/features/auth/hooks/useAuth';
import RoleSelector from '@/features/auth/components/RoleSelector';
import Button from '@/components/ui/Button';
import { FileText } from 'lucide-react';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  
  const handleLogout = async () => {
    try {
      await logout();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <FileText className="h-8 w-8 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">Tender Automation</span>
          </Link>
          
          {/* User info and role selector */}
          {isAuthenticated && user && (
            <div className="flex items-center gap-6">
              <RoleSelector />
              
              <div className="flex items-center gap-3">
                <div className="text-sm">
                  <p className="font-medium text-gray-900">{user.name}</p>
                  <p className="text-gray-500">{user.email}</p>
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleLogout}
                >
                  Logout
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
