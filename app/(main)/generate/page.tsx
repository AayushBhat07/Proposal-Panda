'use client';

/**
 * Tender Generation Page
 * Allows users to generate a new tender document by filling a structured form
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { saveToLocalStorage } from '@/services/storage/mockStorageService';
import type { IntelligenceReport } from '@/features/intelligence-orchestrator/types/orchestration.types';

interface TenderFormData {
  projectName: string;
  projectDescription: string;
  issuingAuthority: string;
  projectLocation: string;
  estimatedProjectCost: string;
  earnestMoneyDeposit: string;
  expectedCompletionPeriod: string;
  bidSubmissionDeadline: string;
}

export default function GenerateTenderPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<TenderFormData>({
    projectName: '',
    projectDescription: '',
    issuingAuthority: '',
    projectLocation: '',
    estimatedProjectCost: '',
    earnestMoneyDeposit: '',
    expectedCompletionPeriod: '',
    bidSubmissionDeadline: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Collect all form values into a single payload object
      const payload = {
        ...formData
      };

      // Call backend API using fetch
      const response = await fetch('/api/tender/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to generate tender. Please try again.');
      }

      // Parse response (backend returns IntelligenceReport structure)
      const data = await response.json();

      // Validate response structure
      if (!data.tenderId || !data.summary || !data.compliance || !data.metadata) {
        throw new Error('Invalid response structure from backend');
      }

      // Persist generated tender to localStorage using SAME schema as analyzed tenders
      const reportWithId = {
        id: data.tenderId,
        type: 'generated',
        fileName: 'Generated Tender',
        uploadedAt: new Date().toISOString(),
        summary: data.summary,
        compliance: data.compliance,
        metadata: data.metadata,
      };

      // Save to localStorage using existing key
      saveToLocalStorage('intelligenceReports', reportWithId);

      // Store latest tender ID
      localStorage.setItem('tender-app-latestTenderId', data.tenderId);

      // Redirect to analysis page
      router.push(`/tenders/${data.tenderId}/analysis`);
    } catch (err) {
      // On failure: Show inline error message
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate tender. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePrefillDemoData = () => {
    setFormData({
      projectName: 'Ultra Mega Pothole Repair Mission',
      projectDescription: 'A comprehensive initiative to repair potholes of all sizes, shapes, and magnitudes across the city. This mission aims to ensure smooth transportation for all citizens.',
      issuingAuthority: 'Ministry of Extremely Important Roads',
      projectLocation: 'Somewhere Between Traffic Signals',
      estimatedProjectCost: '₹42 Crores (approx.)',
      earnestMoneyDeposit: '₹2 Lakhs',
      expectedCompletionPeriod: 'Before next monsoon (hopefully)',
      bidSubmissionDeadline: '2024-12-31'
    });
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Generate New Tender</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={handlePrefillDemoData}
          className="text-sm"
        >
          Prefill Demo Data
        </Button>
      </div>

      <Card variant="elevated">
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}
          {/* Project Information Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              1. Project Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="projectName" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Name
                </label>
                <input
                  type="text"
                  id="projectName"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="Enter project name"
                />
              </div>
              
              <div>
                <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Description
                </label>
                <textarea
                  id="projectDescription"
                  name="projectDescription"
                  value={formData.projectDescription}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="Describe the project in detail"
                />
              </div>
            </div>
          </div>

          {/* Location & Authority Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              2. Location & Authority
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="issuingAuthority" className="block text-sm font-medium text-gray-700 mb-2">
                  Issuing Authority
                </label>
                <input
                  type="text"
                  id="issuingAuthority"
                  name="issuingAuthority"
                  value={formData.issuingAuthority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="Name of the issuing authority"
                />
              </div>
              
              <div>
                <label htmlFor="projectLocation" className="block text-sm font-medium text-gray-700 mb-2">
                  Project Location
                </label>
                <input
                  type="text"
                  id="projectLocation"
                  name="projectLocation"
                  value={formData.projectLocation}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="City, State"
                />
              </div>
            </div>
          </div>

          {/* Financial Details Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              3. Financial Details
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="estimatedProjectCost" className="block text-sm font-medium text-gray-700 mb-2">
                  Estimated Project Cost
                </label>
                <input
                  type="text"
                  id="estimatedProjectCost"
                  name="estimatedProjectCost"
                  value={formData.estimatedProjectCost}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="Enter cost estimate"
                />
              </div>
              
              <div>
                <label htmlFor="earnestMoneyDeposit" className="block text-sm font-medium text-gray-700 mb-2">
                  Earnest Money Deposit
                </label>
                <input
                  type="text"
                  id="earnestMoneyDeposit"
                  name="earnestMoneyDeposit"
                  value={formData.earnestMoneyDeposit}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="Amount required"
                />
              </div>
            </div>
          </div>

          {/* Timeline Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b border-gray-200">
              4. Timeline
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="expectedCompletionPeriod" className="block text-sm font-medium text-gray-700 mb-2">
                  Expected Completion Period
                </label>
                <input
                  type="text"
                  id="expectedCompletionPeriod"
                  name="expectedCompletionPeriod"
                  value={formData.expectedCompletionPeriod}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="Duration to complete project"
                />
              </div>
              
              <div>
                <label htmlFor="bidSubmissionDeadline" className="block text-sm font-medium text-gray-700 mb-2">
                  Bid Submission Deadline
                </label>
                <input
                  type="text"
                  id="bidSubmissionDeadline"
                  name="bidSubmissionDeadline"
                  value={formData.bidSubmissionDeadline}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900 text-gray-900"
                  placeholder="DD/MM/YYYY"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              size="lg"
              disabled={loading}
              className="px-8 py-3"
            >
              {loading ? 'Generating tender document…' : 'Generate Tender'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}