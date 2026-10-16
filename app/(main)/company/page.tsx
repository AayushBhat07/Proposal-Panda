'use client';

/**
 * The company file after onboarding: the same parts on one page. Admins and Bid Writers can edit it;
 * everyone else reads it.
 */

import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { useOnboarding } from '@/lib/context/OnboardingContext';
import { useAuthStore } from '@/state/authStore';
import { CompanySection, ExperienceSection, FinanceSection, TeamSection, tidyProfile } from '@/components/onboarding/ProfileSections';
import type { CompanyProfile } from '@/types/onboarding.types';

const PARTS = [
  { id: 'company', title: 'Company and registration', Section: CompanySection },
  { id: 'finances', title: 'Turnover and finances', Section: FinanceSection },
  { id: 'works', title: 'Similar works completed', Section: ExperienceSection },
  { id: 'team', title: 'Key staff and plant', Section: TeamSection },
];

export default function CompanyPage() {
  const { companyProfile, setCompanyProfile } = useOnboarding();
  const { can } = useAuthStore();
  const editable = can('bid.generate');
  const [draft, setDraft] = useState<CompanyProfile | null>(companyProfile);
  const [status, setStatus] = useState<'clean' | 'dirty' | 'saved'>('clean');

  if (!draft) return null;

  const valid = !!(draft.legalName.trim() && draft.registrationClass.trim() && draft.registeredAddress.trim());
  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setCompanyProfile(tidyProfile(draft));
    setStatus('saved');
  };

  return (
    <form onSubmit={handleSave} className="mx-auto flex max-w-4xl flex-col gap-10 px-4 pt-8 pb-24 sm:px-8 lg:px-14">
      <div className="flex flex-col gap-3">
        <span className="font-mono text-xs tracking-widest text-muted">COMPANY FILE</span>
        <h1 className="font-serif text-4xl leading-tight text-balance text-ink">{draft.legalName || 'Your company'}</h1>
        <p className="max-w-2xl text-sm leading-relaxed text-pretty text-ink-soft">
          Bids generated from now on are filled from these details. Bids you already generated keep the details they
          were made with. GSTIN, PAN and certificates are kept in the{' '}
          {can('vault.use') ? (
            <Link href="/vault" className="text-forest underline">
              document vault
            </Link>
          ) : (
            'document vault'
          )}
          .
        </p>
        {!editable && <p className="text-sm text-muted">Only an Admin or Bid Writer can change the company file.</p>}
      </div>

      {PARTS.map(({ id, title, Section }) => (
        <section key={id} aria-labelledby={`part-${id}`} className="flex flex-col gap-5 border border-rule-strong bg-sheet p-6 sm:p-8">
          <h2 id={`part-${id}`} className="font-serif text-2xl text-ink">
            {title}
          </h2>
          <Section
            value={draft}
            readOnly={!editable}
            onChange={next => {
              setDraft(next);
              setStatus('dirty');
            }}
          />
        </section>
      ))}

      {editable && (
        <div className="sticky bottom-0 -mx-4 flex items-center justify-end gap-4 border-t border-rule bg-paper px-4 py-4 sm:-mx-8 sm:px-8">
          <span role="status" className="text-sm text-ink-soft">
            {!valid ? 'Name, class and address are required.' : status === 'saved' ? 'Saved.' : status === 'dirty' ? 'Unsaved changes' : ''}
          </span>
          <Button type="submit" disabled={!valid || status !== 'dirty'}>
            Save company file
          </Button>
        </div>
      )}
    </form>
  );
}
