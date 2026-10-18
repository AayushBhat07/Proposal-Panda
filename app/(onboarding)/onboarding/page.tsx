'use client';

/**
 * First-time setup: company, finances, similar works, team and plant, then a review. Each step is saved as
 * the contractor moves on, so leaving halfway keeps what was entered.
 */

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { useAuth } from '@/features/auth/hooks/useAuth';
import { useAuthStore } from '@/state/authStore';
import Button from '@/components/ui/Button';
import OnboardingLayout from '@/components/onboarding/OnboardingLayout';
import OnboardingSummary from '@/components/onboarding/OnboardingSummary';
import { CompanySection, ExperienceSection, FinanceSection, TeamSection, tidyProfile } from '@/components/onboarding/ProfileSections';
import type { CompanyProfile } from '@/types/onboarding.types';
import { SAMPLE_DATA_ENABLED, sampleProfile } from '@/lib/company/sample';
import { Sparkles } from 'lucide-react';

const STEPS = ['Company', 'Finances', 'Similar works', 'Team and plant', 'Review'] as const;

const INTROS: Record<number, { title: string; body: string }> = {
  0: { title: 'Your company', body: 'Enter these as they appear on your registration certificate.' },
  1: { title: 'Turnover and finances', body: 'Used for the eligibility proforma and bid capacity.' },
  2: { title: 'Similar works completed', body: 'Listed in Cover I as proof of experience.' },
  3: { title: 'Key staff and plant', body: 'Listed with the bid capacity statement.' },
};

const EMPTY: CompanyProfile = { legalName: '', registrationClass: '', registeredAddress: '' };

export default function OnboardingPage() {
  const router = useRouter();
  const { companyProfile, isComplete, isLoaded } = useOnboarding();
  const { can, isLoading } = useAuth(); // also loads the signed-in user shown on the review step

  useEffect(() => {
    if (isComplete) router.push('/dashboard');
  }, [isComplete, router]);

  // Wait for the saved draft so a returning contractor picks up where they stopped.
  if (!isLoaded || isLoading || isComplete) return null;
  // The company file is shared by the office; only those who can edit it set it up.
  if (!can('bid.generate')) {
    return (
      <div className="mx-auto flex max-w-xl flex-col gap-3 px-4 py-24 text-center">
        <h1 className="font-serif text-3xl text-ink">The company file isn&apos;t set up yet</h1>
        <p className="text-ink-soft">Ask your Admin or Bid Writer to finish setup. You can sign in again once they have.</p>
      </div>
    );
  }
  return <Wizard saved={companyProfile} />;
}

function Wizard({ saved }: { saved: CompanyProfile | null }) {
  const router = useRouter();
  const { setCompanyProfile, completeOnboarding } = useOnboarding();
  const { can } = useAuthStore();
  const [step, setStep] = useState(0);
  const [reached, setReached] = useState(saved ? 1 : 0);
  const [draft, setDraft] = useState<CompanyProfile>(saved ?? EMPTY);

  const go = (next: number) => {
    setCompanyProfile(tidyProfile(draft));
    setStep(next);
    setReached(r => Math.max(r, next));
    window.scrollTo({ top: 0 });
  };

  const handleNext = (e: FormEvent) => {
    e.preventDefault();
    go(step + 1);
  };

  const handleComplete = () => {
    setCompanyProfile(tidyProfile(draft));
    completeOnboarding();
    // GSTIN, PAN and certificates are the next thing a bid needs; send people who can open the vault there.
    setTimeout(() => router.push(can('vault.use') ? '/vault' : '/dashboard'), 100);
  };

  // Fills every step with the sample contractor and opens the review, where each part can still be edited.
  const fillSample = () => {
    const sample = sampleProfile();
    setDraft(sample);
    setCompanyProfile(sample);
    setStep(4);
    setReached(4);
    window.scrollTo({ top: 0 });
  };

  const companyValid = !!(draft.legalName.trim() && draft.registrationClass.trim() && draft.registeredAddress.trim());
  const Section = [CompanySection, FinanceSection, ExperienceSection, TeamSection][step];

  return (
    <OnboardingLayout steps={STEPS} current={step} reached={companyValid ? reached : 0} onStep={i => (i === step ? undefined : go(i))}>
      {SAMPLE_DATA_ENABLED && step < 4 && (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3 border border-dashed border-rule-strong px-4 py-3">
          <p className="text-sm text-ink-soft">Just trying ProposalPanda? Fill every step with a made-up contractor.</p>
          <Button type="button" variant="outline" size="sm" onClick={fillSample}>
            <Sparkles className="h-4 w-4" aria-hidden /> Fill with sample data
          </Button>
        </div>
      )}
      {step < 4 ? (
        <form onSubmit={handleNext} className="flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h2 className="font-serif text-2xl text-ink">{INTROS[step].title}</h2>
            <p className="text-sm text-ink-soft">{INTROS[step].body}</p>
          </div>
          <Section value={draft} onChange={setDraft} />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
            {step > 0 ? (
              <Button type="button" variant="outline" onClick={() => go(step - 1)}>
                Back
              </Button>
            ) : (
              <span />
            )}
            <div className="flex flex-wrap gap-3">
              {step > 0 && (
                <Button type="button" variant="ghost" onClick={() => go(step + 1)}>
                  Skip for now
                </Button>
              )}
              <Button type="submit" disabled={!companyValid}>
                {step === 3 ? 'Review' : 'Continue'}
              </Button>
            </div>
          </div>
        </form>
      ) : (
        <OnboardingSummary companyProfile={tidyProfile(draft)} onEdit={go} onComplete={handleComplete} />
      )}
    </OnboardingLayout>
  );
}
