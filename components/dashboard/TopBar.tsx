'use client';

/**
 * Phase 5A: Top Bar
 * Top navigation with company info, role badge, search, and user menu
 */

import { useOnboarding } from '@/lib/context/OnboardingContext';

export default function TopBar() {
  const { companyProfile, selectedRole } = useOnboarding();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Company Info */}
      <div className="flex items-center gap-4">
        <div>
          <div className="text-sm font-medium text-gray-900">
            {companyProfile?.legalName || 'Company Name'}
          </div>
          <div className="text-xs text-gray-500">
            Nagpur Division · Reg: {companyProfile?.registrationClass || 'N/A'}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex-1 max-w-xl mx-8">
        <input
          type="text"
          placeholder="Search tender ID..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-900"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        {/* Role Badge */}
        {selectedRole && (
          <div className="px-3 py-1 bg-amber-900 text-white text-xs font-medium rounded-full">
            {selectedRole}
          </div>
        )}

        {/* Icons */}
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
          🔔
        </button>
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded">
          🌙
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 bg-amber-900 rounded-full flex items-center justify-center text-white text-sm font-medium">
          R
        </div>
      </div>
    </header>
  );
}
