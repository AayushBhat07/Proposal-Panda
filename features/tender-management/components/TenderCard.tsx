'use client';

import { Tender } from '@/types/tender.types';
import { formatDate, daysRemaining } from '@/lib/utils/delays';
import Link from 'next/link';

interface TenderCardProps {
  tender: Tender;
}

export default function TenderCard({ tender }: TenderCardProps) {
  const statusColors = {
    Draft: 'bg-gray-100 text-gray-800',
    InReview: 'bg-yellow-100 text-yellow-800',
    Submitted: 'bg-blue-100 text-blue-800',
    Accepted: 'bg-green-100 text-green-800',
    Flagged: 'bg-orange-100 text-orange-800',
    Rejected: 'bg-red-100 text-red-800'
  };

  const getDeadlineStatus = () => {
    if (!tender.deadline) return null;

    const days = daysRemaining(tender.deadline);
    if (days < 0) {
      return { text: 'Overdue', color: 'text-red-600' };
    } else if (days === 0) {
      return { text: 'Due today', color: 'text-orange-600' };
    } else if (days <= 7) {
      return { text: `${days} days left`, color: 'text-orange-600' };
    } else {
      return { text: `${days} days left`, color: 'text-gray-600' };
    }
  };

  const deadlineStatus = getDeadlineStatus();
  const createdDate = typeof tender.createdAt === 'string' 
    ? new Date(tender.createdAt) 
    : tender.createdAt;

  return (
    <Link href={`/tenders/${tender.id}`}>
      <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow cursor-pointer">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {tender.title}
            </h3>
            {tender.description && (
              <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                {tender.description}
              </p>
            )}
          </div>
          <span 
            className={`ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${statusColors[tender.status]}`}
          >
            {tender.status}
          </span>
        </div>

        {/* Metadata */}
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          {/* Created Date */}
          <div className="flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" 
              />
            </svg>
            <span>Created {formatDate(createdDate)}</span>
          </div>

          {/* Document Count */}
          <div className="flex items-center">
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <span>{tender.documentIds.length} {tender.documentIds.length === 1 ? 'document' : 'documents'}</span>
          </div>

          {/* Deadline */}
          {tender.deadline && deadlineStatus && (
            <div className={`flex items-center font-medium ${deadlineStatus.color}`}>
              <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" 
                />
              </svg>
              <span>{deadlineStatus.text}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
