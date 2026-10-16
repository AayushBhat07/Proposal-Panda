'use client';

/**
 * Last onboarding step: everything entered, with what each part fills in the bid, and what comes next.
 */

import type { ReactNode } from 'react';
import Button from '@/components/ui/Button';
import type { CompanyProfile } from '@/types/onboarding.types';
import { useAuthStore } from '@/state/authStore';
import { ROLE_LABELS } from '@/lib/auth/rbac';
import { formatLakh } from '@/lib/company/profile';

interface OnboardingSummaryProps {
  companyProfile: CompanyProfile;
  onEdit: (step: number) => void;
  onComplete: () => void;
}

const MISSING = <span className="text-ochre">Not entered: the bid will leave a blank</span>;

export default function OnboardingSummary({ companyProfile: p, onEdit, onComplete }: OnboardingSummaryProps) {
  const { user, can } = useAuthStore();
  const registration = [p.registrationAuthority, p.registrationClass, p.registrationNumber].filter(Boolean).join(' · ');
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-serif text-2xl text-ink">Check your company file</h2>
        <p className="text-sm text-ink-soft">Anything left blank shows up as a highlighted blank in the bid, for you to fill there.</p>
      </div>

      <Part title="Company" onEdit={() => onEdit(0)}>
        <Row label="Legal name">{p.legalName}</Row>
        <Row label="Constitution">{p.constitution ?? MISSING}</Row>
        <Row label="Address">{p.registeredAddress}</Row>
        <Row label="Registration">
          {registration}
          {p.registrationValidUpto && <span className="text-muted">, valid up to {p.registrationValidUpto}</span>}
        </Row>
        <Row label="Signs the bid">
          {p.signatoryName ? `${p.signatoryName}${p.signatoryDesignation ? `, ${p.signatoryDesignation}` : ''}` : MISSING}
        </Row>
      </Part>

      <Part title="Finances" onEdit={() => onEdit(1)}>
        {p.turnover?.length ? (
          p.turnover.map(t => (
            <Row key={t.year} label={`FY ${t.year}`}>
              {t.lakh != null ? <span className="font-mono tabular-nums">{formatLakh(t.lakh)}</span> : <span className="text-muted">blank</span>}
            </Row>
          ))
        ) : (
          <Row label="Turnover">{MISSING}</Row>
        )}
        <Row label="Solvency">{p.solvencyLakh != null ? <span className="font-mono">{formatLakh(p.solvencyLakh)}</span> : MISSING}</Row>
        <Row label="Works in hand">{p.worksInHandLakh != null ? <span className="font-mono">{formatLakh(p.worksInHandLakh)}</span> : MISSING}</Row>
      </Part>

      <Part title="Similar works" onEdit={() => onEdit(2)}>
        {p.similarWorks?.length ? (
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm text-ink">
            {p.similarWorks.map((w, i) => (
              <li key={i}>
                {w.name}
                <span className="text-ink-soft">
                  {w.client && `, ${w.client}`}
                  {w.valueLakh != null && `, ${formatLakh(w.valueLakh)}`}
                  {w.completion && `, completed ${w.completion}`}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <Row label="Works">{MISSING}</Row>
        )}
      </Part>

      <Part title="Team and plant" onEdit={() => onEdit(3)}>
        <Row label="Key staff">
          {p.keyStaff?.length ? p.keyStaff.map(s => `${s.name}${s.qualification ? ` (${s.qualification})` : ''}`).join(', ') : MISSING}
        </Row>
        <Row label="Plant">{p.machinery?.trim() ? <span className="whitespace-pre-line">{p.machinery.trim()}</span> : MISSING}</Row>
      </Part>

      <div className="border-l-2 border-forest bg-forest-tint px-4 py-3 text-sm text-ink">
        <p>
          Signed in as <span className="font-medium">{user ? ROLE_LABELS[user.role] : 'unknown role'}</span>.{' '}
          {can('vault.use')
            ? 'Next you will set up the document vault for GSTIN, PAN and certificates. They are encrypted on this computer and never sent to the AI model.'
            : 'An Admin or Bid Writer adds GSTIN, PAN and certificates to the document vault.'}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-rule pt-6">
        <Button type="button" variant="outline" onClick={() => onEdit(3)}>
          Back
        </Button>
        <Button type="button" onClick={onComplete}>
          {can('vault.use') ? 'Finish and open the vault' : 'Finish setup'}
        </Button>
      </div>
    </div>
  );
}

function Part({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  return (
    <section className="border border-rule p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-lg text-ink">{title}</h3>
        <Button type="button" variant="ghost" size="sm" onClick={onEdit} aria-label={`Edit ${title.toLowerCase()}`}>
          Edit
        </Button>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <dl className="grid grid-cols-1 gap-1 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm text-ink sm:col-span-2">{children}</dd>
    </dl>
  );
}
