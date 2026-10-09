'use client';

/**
 * App header: brand, the pages this role can open, company, user and role, sign out.
 */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { useAuthStore } from '@/state/authStore';
import { ROLE_LABELS, type Permission } from '@/lib/auth/rbac';

// Only pages that exist; each is shown only to roles that can open it.
const NAV_ITEMS: Array<{ label: string; href: string; permission?: Permission }> = [
  { label: 'Register', href: '/dashboard' },
];

export default function TopBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { companyProfile } = useOnboarding();
  const { user, can, logout } = useAuthStore();

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  return (
    <header className="border-b border-rule px-4 sm:px-8 lg:px-14 flex flex-wrap items-center gap-x-8 gap-y-2">
      <Link href="/dashboard" className="font-serif text-xl font-semibold text-ink py-3">
        ProposalPanda
      </Link>

      <nav aria-label="Main" className="flex flex-1 flex-wrap gap-6">
        {NAV_ITEMS.filter(item => !item.permission || can(item.permission)).map(item => {
          const isActive = pathname === item.href || pathname.startsWith('/tenders');
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? 'page' : undefined}
              className={`inline-flex min-h-11 items-center border-b-2 text-sm ${
                isActive ? 'border-forest font-medium text-ink' : 'border-transparent text-ink-soft hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-4 text-sm text-ink-soft">
        {companyProfile?.legalName && (
          <span className="hidden md:inline">{companyProfile.legalName}</span>
        )}
        {user && (
          <span title={user.email}>
            {user.name} · <span className="font-medium text-ink">{ROLE_LABELS[user.role]}</span>
          </span>
        )}
        <button
          type="button"
          onClick={handleLogout}
          aria-label="Sign out"
          className="flex h-11 w-11 items-center justify-center rounded border border-rule text-ink-soft hover:bg-sheet hover:text-ink"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
