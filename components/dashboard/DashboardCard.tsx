'use client';

/**
 * Phase 5A: Dashboard Card
 * Reusable card component for dashboard sections
 */

import { ReactNode } from 'react';

interface DashboardCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function DashboardCard({
  title,
  subtitle,
  icon,
  children,
  className = '',
}: DashboardCardProps) {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg ${className}`}>
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <span className="text-lg">{icon}</span>}
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
