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
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl">
        <div className="mb-10 flex flex-col gap-3">
          <span className="font-serif text-xl font-semibold text-ink">ProposalPanda</span>
          <h1 className="font-serif text-4xl leading-tight text-ink">Set up your company file</h1>
          <p className="text-ink-soft">
            These details fill the proformas in every bid, so enter them as they appear on your registration.
          </p>
        </div>

        <ol className="mb-8 flex items-center gap-4" aria-label="Steps">
          <Step number={1} label="Company" isActive={currentStep === 1} isComplete={currentStep > 1} />
          <li aria-hidden className="h-px w-16 bg-rule-strong" />
          <Step number={2} label="Review" isActive={currentStep === 2} isComplete={false} />
        </ol>

        <div className="border border-rule-strong bg-sheet p-6 sm:p-8">{children}</div>
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
    <li className="flex items-center gap-2" aria-current={isActive ? 'step' : undefined}>
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${
          isActive || isComplete ? 'bg-forest text-paper' : 'border border-rule-strong text-muted'
        }`}
      >
        {isComplete ? '✓' : number}
      </span>
      <span className={`text-sm ${isActive ? 'font-medium text-ink' : 'text-muted'}`}>{label}</span>
    </li>
  );
}
