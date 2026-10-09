'use client';

/**
 * Phase 5A: Onboarding Layout
 * Full-page centered layout with step indicator
 */

import { ReactNode } from 'react';

interface OnboardingLayoutProps {
  children: ReactNode;
  currentStep: 1 | 2;
}

export default function OnboardingLayout({ children, currentStep }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 bg-amber-900 rounded-lg flex items-center justify-center">
              <span className="text-white text-xl">📋</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">InfraTender AI</h1>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">
            Welcome to InfraTender AI
          </h2>
          <p className="text-gray-600">
            Let's set up your secure workspace for tender analysis.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-8 mb-12">
          <Step number={1} label="COMPANY" isActive={currentStep === 1} isComplete={currentStep > 1} />
          <StepConnector />
          <Step number={2} label="REVIEW" isActive={currentStep === 2} isComplete={false} />
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {children}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-gray-500 flex items-center justify-center gap-6">
          <a href="#" className="hover:text-gray-700">Privacy Policy</a>
          <a href="#" className="hover:text-gray-700">Terms of Service</a>
          <a href="#" className="hover:text-gray-700">Support</a>
        </div>
      </div>
    </div>
  );
}

interface StepProps {
  number: number;
  label: string;
  isActive: boolean;
  isComplete: boolean;
}

function Step({ number, label, isActive, isComplete }: StepProps) {
  return (
    <div className="flex flex-col items-center">
      <div
        className={`
          w-12 h-12 rounded-full flex items-center justify-center font-semibold text-lg
          ${isComplete ? 'bg-amber-900 text-white' : ''}
          ${isActive ? 'bg-amber-900 text-white' : ''}
          ${!isActive && !isComplete ? 'bg-gray-200 text-gray-500' : ''}
        `}
      >
        {isComplete ? '✓' : number}
      </div>
      <span className={`mt-2 text-xs font-medium ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
        {label}
      </span>
    </div>
  );
}

function StepConnector() {
  return <div className="w-24 h-0.5 bg-gray-300" />;
}
