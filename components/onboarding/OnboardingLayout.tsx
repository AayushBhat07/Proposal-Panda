'use client';

/**
 * Onboarding frame: brand, intro and the step indicator. Steps already reached can be revisited.
 */

import { ReactNode } from 'react';

interface OnboardingLayoutProps {
  children: ReactNode;
  steps: readonly string[];
  /** Index into steps */
  current: number;
  /** Furthest step reached, so earlier steps can be clicked */
  reached: number;
  onStep: (index: number) => void;
}

export default function OnboardingLayout({ children, steps, current, reached, onStep }: OnboardingLayoutProps) {
  return (
    <div className="min-h-screen bg-paper px-4 py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-10 flex flex-col gap-3">
          <span className="font-serif text-xl font-semibold text-ink">ProposalPanda</span>
          <h1 className="font-serif text-4xl leading-tight text-balance text-ink">Set up your company file</h1>
          <p className="max-w-2xl text-pretty text-ink-soft">
            You enter this once. Every bid is filled from it: the letters, the eligibility proforma, the bid capacity
            calculation and the list of similar works. Only the company step is required; you can finish the rest
            later from the Company page.
          </p>
        </div>

        <ol className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-2" aria-label="Steps">
          {steps.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              {i > 0 && <span aria-hidden className="h-px w-6 bg-rule-strong sm:w-10" />}
              <button
                type="button"
                disabled={i > reached}
                onClick={() => onStep(i)}
                aria-current={i === current ? 'step' : undefined}
                className="flex min-h-11 items-center gap-2 disabled:cursor-default"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full font-mono text-xs ${
                    i <= reached ? 'bg-forest text-paper' : 'border border-rule-strong text-muted'
                  }`}
                >
                  {i < reached && i !== current ? '✓' : i + 1}
                </span>
                <span className={`text-sm ${i === current ? 'font-medium text-ink' : 'text-muted'}`}>{label}</span>
              </button>
            </li>
          ))}
        </ol>

        <div className="border border-rule-strong bg-sheet p-6 sm:p-8">{children}</div>
      </div>
    </div>
  );
}
