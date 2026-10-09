'use client';

/**
 * Phase 5A: Sidebar Navigation
 * Left sidebar with navigation items
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/state/authStore';
import type { Permission } from '@/lib/auth/rbac';

// Only pages that exist; each is shown only to roles that can open it.
const NAV_ITEMS: Array<{ id: string; label: string; icon: string; href: string; permission?: Permission }> = [
  { id: 'dashboard', label: 'Dashboard', icon: '▦', href: '/dashboard' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { can, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-amber-100 rounded flex items-center justify-center">
            <span className="text-lg">📋</span>
          </div>
          <div>
            <div className="text-sm font-semibold text-gray-900">InfraTender.ai</div>
            <div className="text-xs text-gray-500">Contractor Portal</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {NAV_ITEMS.filter(item => !item.permission || can(item.permission)).map(item => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                ${
                  isActive
                    ? 'bg-amber-50 text-amber-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }
              `}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={handleLogout}
          className="w-full text-left px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100"
        >
          Sign out
        </button>
      </div>

      {/* Subscription Info */}
      <div className="p-4 border-t border-gray-200">
        <div className="text-xs text-gray-500 mb-1">Subscription Plan</div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-gray-900">Enterprise</span>
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded">
            Active
          </span>
        </div>
        <div className="text-xs text-gray-600">750/1000 pages analyzed</div>
        <div className="mt-2 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-amber-900" style={{ width: '75%' }} />
        </div>
      </div>
    </aside>
  );
}
