'use client';

import Link from 'next/link';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import TenderCard from './TenderCard';
import { useTenders } from '../hooks/useTenders';

export default function TenderList() {
  const { tenders, isLoading, error, refreshTenders } = useTenders();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600">Loading tenders...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex">
          <svg className="h-5 w-5 text-red-400 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading tenders</h3>
            <p className="mt-1 text-sm text-red-700">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshTenders}
              className="mt-3"
            >
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Empty state
  if (tenders.length === 0) {
    return (
      <div className="text-center py-12">
        <svg 
          className="mx-auto h-24 w-24 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No tenders yet</h3>
        <p className="mt-2 text-sm text-gray-600">
          Get started by creating your first tender submission.
        </p>
        <Link href="/tenders/new">
          <Button variant="primary" size="lg" className="mt-6">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
            Create Your First Tender
          </Button>
        </Link>
      </div>
    );
  }

  // List of tenders
  return (
    <div className="space-y-6">
      {/* Header with create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">
            All Tenders ({tenders.length})
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Manage your tender submissions and track their progress
          </p>
        </div>
        <Link href="/tenders/new">
          <Button variant="primary">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M12 4v16m8-8H4" 
              />
            </svg>
            New Tender
          </Button>
        </Link>
      </div>

      {/* Tender cards grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {tenders.map((tender) => (
          <TenderCard key={tender.id} tender={tender} />
        ))}
      </div>

      {/* Refresh button */}
      <div className="flex justify-center pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={refreshTenders}
        >
          <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" 
            />
          </svg>
          Refresh
        </Button>
      </div>
    </div>
  );
}
