'use client';

/**
 * Phase 5B: Dashboard Page
 * Main dashboard with upload, intelligence snapshot, and activity
 * Enhanced with loading, empty, and error states
 */

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/state/authStore';
import DashboardCard from '@/components/dashboard/DashboardCard';
import TenderUpload from '@/components/dashboard/TenderUpload';
import ProcessingState from '@/components/dashboard/ProcessingState';
import Spinner from '@/components/ui/Spinner';

type UploadState = 'idle' | 'processing' | 'success' | 'error';
type ProcessingStage = 'analyzing' | 'scoring' | 'finalizing';

export default function DashboardPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('analyzing');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [hasActivityData, setHasActivityData] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Simulate loading dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      setIsLoadingData(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Check if user has any tender activity
      setHasActivityData(true); // In real app, check actual data
      setIsLoadingData(false);
    };
    loadDashboardData();
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      setUploadedFile(file);
      setUploadState('processing');
      setProcessingStage('analyzing');
      setErrorMessage(null);

      // TODO: Replace with real pipeline call
      // Simulate processing stages
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingStage('scoring');
      await new Promise(resolve => setTimeout(resolve, 1500));
      setProcessingStage('finalizing');
      await new Promise(resolve => setTimeout(resolve, 1000));

      setUploadState('success');
      
      // Redirect to analysis view
      setTimeout(() => {
        router.push('/tenders/mock-tender-id/analysis');
      }, 1500);
    } catch (error) {
      setUploadState('error');
      setErrorMessage('Failed to process tender document. Please try again.');
    }
  };

  const handleRetryUpload = () => {
    setUploadState('idle');
    setUploadedFile(null);
    setErrorMessage(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Greeting */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Good Morning, {user?.name || 'User'}
        </h1>
        <p className="text-sm text-gray-600">Here is your intelligence snapshot for today.</p>
        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
          <span>📅 Oct 24, 2023</span>
          <span>📍 Mumbai, MH</span>
        </div>
      </div>

      {/* Upload Card */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2">
          <DashboardCard title="Upload New Tender" icon="☁️">
            {uploadState === 'idle' && <TenderUpload onUpload={handleFileUpload} />}
            {uploadState === 'processing' && uploadedFile && (
              <ProcessingState fileName={uploadedFile.name} stage={processingStage} />
            )}
            {uploadState === 'success' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✓</span>
                </div>
                <p className="text-gray-900 font-medium mb-2">Analysis Complete</p>
                <p className="text-sm text-gray-600">Redirecting to report...</p>
              </div>
            )}
            {uploadState === 'error' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-3xl">✕</span>
                </div>
                <p className="text-gray-900 font-medium mb-2">Processing Failed</p>
                <p className="text-sm text-gray-600 mb-4">
                  {errorMessage || 'Please try again or contact support.'}
                </p>
                <button
                  onClick={handleRetryUpload}
                  className="px-4 py-2 bg-amber-900 text-white rounded hover:bg-amber-800 transition-colors"
                >
                  Try Again
                </button>
              </div>
            )}
          </DashboardCard>
        </div>

        {/* Intelligence Snapshot */}
        <DashboardCard title="Intelligence Snapshot">
          {isLoadingData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Spinner size="md" className="text-amber-900" />
              <p className="text-sm text-gray-600 mt-4">Loading insights...</p>
            </div>
          ) : hasActivityData ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-2">LATEST ANALYSIS</div>
                <div className="text-sm font-medium text-gray-900">NH-66 Expansion (Panvel-Inda...)</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center">
                  <div className="relative inline-flex items-center justify-center w-20 h-20 mb-2">
                    <svg className="w-20 h-20 transform -rotate-90">
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        className="text-gray-200"
                      />
                      <circle
                        cx="40"
                        cy="40"
                        r="32"
                        stroke="currentColor"
                        strokeWidth="8"
                        fill="none"
                        strokeDasharray="201"
                        strokeDashoffset="30"
                        className="text-green-500"
                      />
                    </svg>
                    <div className="absolute text-xl font-bold text-gray-900">85%</div>
                  </div>
                  <div className="text-xs text-gray-600">Compliance</div>
                  <div className="text-xs text-green-600 font-medium">Strong</div>
                </div>
                <div className="text-center">
                  <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                    <span className="text-3xl">⚠️</span>
                  </div>
                  <div className="text-xs text-gray-600">Risk Level</div>
                  <div className="text-xs text-orange-600 font-medium">Medium</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📊</span>
              </div>
              <p className="text-sm text-gray-600">No analysis data yet</p>
              <p className="text-xs text-gray-500 mt-1">Upload your first tender to see insights</p>
            </div>
          )}
        </DashboardCard>
      </div>

      {/* Recent Tender Activity */}
      <DashboardCard title="Recent Tender Activity">
        {isLoadingData ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="md" className="text-amber-900" />
            <p className="text-sm text-gray-600 mt-4">Loading activity...</p>
          </div>
        ) : hasActivityData ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
                    <th className="pb-3 font-medium">TENDER ID / NAME</th>
                    <th className="pb-3 font-medium">DIVISION</th>
                    <th className="pb-3 font-medium">DATE UPLOADED</th>
                    <th className="pb-3 font-medium">STATUS</th>
                    <th className="pb-3 font-medium">ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  <TenderActivityRow
                    id="PWD-Maha-2023-44"
                    name="Road Resurfacing - Wardha"
                    division="Nagpur Division"
                    date="Oct 23, 2023"
                    status="Ready for Review"
                    statusColor="green"
                  />
                  <TenderActivityRow
                    id="MSRDC-Exp-092"
                    name="Samruddhi Mahamarg Phase II"
                    division="Aurangabad Division"
                    date="Oct 24, 2023"
                    status="Processing"
                    statusColor="orange"
                  />
                  <TenderActivityRow
                    id="BMC-StormWater-05"
                    name="Drainage Upgrade - Dadar"
                    division="Mumbai City"
                    date="Oct 20, 2023"
                    status="Archived"
                    statusColor="gray"
                  />
                </tbody>
              </table>
            </div>
            <div className="mt-4 text-center">
              <button className="text-sm text-amber-900 hover:text-amber-800 font-medium">
                View All →
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl">📋</span>
            </div>
            <p className="text-sm font-medium text-gray-900 mb-2">No tender activity yet</p>
            <p className="text-xs text-gray-500">Upload a tender document to get started</p>
          </div>
        )}
      </DashboardCard>
    </div>
  );
}

interface TenderActivityRowProps {
  id: string;
  name: string;
  division: string;
  date: string;
  status: string;
  statusColor: 'green' | 'orange' | 'gray';
}

function TenderActivityRow({ id, name, division, date, status, statusColor }: TenderActivityRowProps) {
  const statusColors = {
    green: 'bg-green-100 text-green-700',
    orange: 'bg-orange-100 text-orange-700',
    gray: 'bg-gray-100 text-gray-700',
  };

  return (
    <tr className="border-b border-gray-100">
      <td className="py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📄</span>
          <div>
            <div className="font-medium text-gray-900">{id}</div>
            <div className="text-xs text-gray-600">{name}</div>
          </div>
        </div>
      </td>
      <td className="py-3 text-gray-700">{division}</td>
      <td className="py-3 text-gray-700">{date}</td>
      <td className="py-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[statusColor]}`}>
          {status}
        </span>
      </td>
      <td className="py-3">
        <button className="text-gray-600 hover:text-gray-900">👁️</button>
      </td>
    </tr>
  );
}

