'use client';

/**
 * Phase 5A: Main Layout
 * Layout for authenticated pages with sidebar and top bar
 */

import { ReactNode } from 'react';
import Sidebar from '@/components/dashboard/Sidebar';
import TopBar from '@/components/dashboard/TopBar';
import MarketTicker from '@/components/dashboard/MarketTicker';

export default function MainLayout({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen flex flex-col">
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar />
          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>
      </div>
      <MarketTicker />
    </div>
  );
}
