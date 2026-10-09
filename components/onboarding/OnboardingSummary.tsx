'use client';

/**
 * Phase 5A: Onboarding Summary
 * Step 2 of onboarding - review and confirm
 */

import Button from '@/components/ui/Button';
import type { CompanyProfile } from '@/types/onboarding.types';
import { useAuthStore } from '@/state/authStore';
import { ROLE_LABELS } from '@/lib/auth/rbac';

interface OnboardingSummaryProps {
  companyProfile: CompanyProfile;
  onBack: () => void;
  onComplete: () => void;
}

export default function OnboardingSummary({
  companyProfile,
  onBack,
  onComplete,
}: OnboardingSummaryProps) {
  const { user } = useAuthStore();
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review Your Profile</h3>
        <p className="text-sm text-gray-600">
          Please review your information before completing setup.
        </p>
      </div>

      {/* Company Profile Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Company Profile</h4>
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-amber-900 hover:text-amber-800"
          >
            Edit
          </button>
        </div>
        <dl className="space-y-3">
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-sm text-gray-600">Legal Name</dt>
            <dd className="col-span-2 text-sm text-gray-900 font-medium">
              {companyProfile.legalName}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-sm text-gray-600">Registration Class</dt>
            <dd className="col-span-2 text-sm text-gray-900 font-medium">
              {companyProfile.registrationClass}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-sm text-gray-600">GSTIN</dt>
            <dd className="col-span-2 text-sm text-gray-900 font-medium">
              {companyProfile.gstin}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-sm text-gray-600">PAN Number</dt>
            <dd className="col-span-2 text-sm text-gray-900 font-medium">
              {companyProfile.panNumber}
            </dd>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <dt className="text-sm text-gray-600">Registered Address</dt>
            <dd className="col-span-2 text-sm text-gray-900">
              {companyProfile.registeredAddress}
            </dd>
          </div>
        </dl>
      </div>

      {/* Role Section */}
      <div className="border border-gray-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-900">Your Role</h4>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500" />
          <span className="text-sm text-gray-900 font-medium">{user ? ROLE_LABELS[user.role] : '—'}</span>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">Note:</span> Roles are assigned by your administrator and
          decide what you can do in the workspace.
        </p>
      </div>

      <div className="flex items-center justify-between pt-4">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="border-gray-300 text-gray-700"
        >
          Back
        </Button>
        <Button
          type="button"
          onClick={onComplete}
          className="bg-amber-900 hover:bg-amber-800 text-white px-6 py-2"
        >
          Complete Setup
        </Button>
      </div>
    </div>
  );
}
