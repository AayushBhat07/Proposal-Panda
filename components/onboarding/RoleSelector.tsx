'use client';

/**
 * Phase 5A: Role Selector
 * Step 2 of onboarding - select primary role
 */

import { useState } from 'react';
import Button from '@/components/ui/Button';
import type { OnboardingState } from '@/types/onboarding.types';

interface RoleSelectorProps {
  onNext: (role: OnboardingState['selectedRole']) => void;
  onBack: () => void;
  initialRole?: OnboardingState['selectedRole'];
}

const ROLES = [
  {
    id: 'Senior Tender Analyst' as const,
    title: 'Senior Tender Analyst',
    description: 'Primary role for analyzing tender documents, identifying risks, and generating compliance reports.',
  },
  {
    id: 'Bid Writer' as const,
    title: 'Bid Writer',
    description: 'Focus on creating bid responses, technical proposals, and compliance documentation.',
  },
  {
    id: 'Legal Compliance Officer' as const,
    title: 'Legal Compliance Officer',
    description: 'Specialized in legal compliance, contract terms, and risk assessment.',
  },
  {
    id: 'Executive' as const,
    title: 'Executive',
    description: 'High-level overview of tender opportunities and portfolio management.',
  },
];

export default function RoleSelector({ onNext, onBack, initialRole }: RoleSelectorProps) {
  const [selectedRole, setSelectedRole] = useState<OnboardingState['selectedRole']>(
    initialRole || null
  );

  const handleSubmit = () => {
    if (selectedRole) {
      onNext(selectedRole);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Select Your Primary Role</h3>
        <p className="text-sm text-gray-600">
          This determines your default dashboard view and analysis emphasis. You can switch roles later.
        </p>
      </div>

      <div className="space-y-3">
        {ROLES.map(role => (
          <button
            key={role.id}
            type="button"
            onClick={() => setSelectedRole(role.id)}
            className={`
              w-full text-left p-4 rounded-lg border-2 transition-all
              ${
                selectedRole === role.id
                  ? 'border-amber-900 bg-amber-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }
            `}
          >
            <div className="flex items-start gap-3">
              <div
                className={`
                  w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5
                  ${selectedRole === role.id ? 'border-amber-900' : 'border-gray-300'}
                `}
              >
                {selectedRole === role.id && (
                  <div className="w-3 h-3 rounded-full bg-amber-900" />
                )}
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-900">{role.title}</div>
                <div className="text-sm text-gray-600 mt-1">{role.description}</div>
              </div>
            </div>
          </button>
        ))}
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
          onClick={handleSubmit}
          disabled={!selectedRole}
          className="bg-amber-900 hover:bg-amber-800 text-white px-6 py-2"
        >
          Continue to Review
        </Button>
      </div>
    </div>
  );
}
