'use client';

/**
 * The parts of the company file, each a controlled form fragment. Onboarding shows them one step at a time;
 * the Company page shows them together.
 */

import { useId, useState, type ReactNode } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import { emptyTurnover, formatLakh, parseLakh } from '@/lib/company/profile';
import { CONSTITUTIONS, type CompanyProfile, type KeyStaff, type SimilarWork } from '@/types/onboarding.types';

export interface SectionProps {
  value: CompanyProfile;
  onChange: (next: CompanyProfile) => void;
  readOnly?: boolean;
}

const input = 'min-h-11 w-full border border-rule-strong bg-paper px-3 py-2 text-ink disabled:bg-sheet disabled:text-ink-soft';

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: (id: string) => ReactNode; wide?: boolean }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1.5 ${wide ? 'sm:col-span-2' : ''}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children(id)}
      {hint && <p className="text-xs text-muted">{hint}</p>}
    </div>
  );
}

/** A ₹ lakh input that keeps what was typed while it is being edited. */
function LakhInput({ id, value, onChange, disabled }: { id: string; value: number | null | undefined; onChange: (v: number | null) => void; disabled?: boolean }) {
  const [text, setText] = useState(value != null ? String(value) : '');
  return (
    <input
      id={id}
      inputMode="decimal"
      value={text}
      disabled={disabled}
      onChange={e => {
        setText(e.target.value);
        onChange(parseLakh(e.target.value));
      }}
      placeholder="₹ lakh"
      className={`${input} font-mono tabular-nums`}
    />
  );
}

export function CompanySection({ value, onChange, readOnly }: SectionProps) {
  const set = (patch: Partial<CompanyProfile>) => onChange({ ...value, ...patch });
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
      <Field label="Company legal name" wide>
        {id => (
          <input id={id} required disabled={readOnly} value={value.legalName} onChange={e => set({ legalName: e.target.value })} placeholder="As on the registration certificate" className={input} />
        )}
      </Field>
      <Field label="Constitution">
        {id => (
          <select id={id} disabled={readOnly} value={value.constitution ?? ''} onChange={e => set({ constitution: e.target.value || undefined })} className={input}>
            <option value="">Choose…</option>
            {CONSTITUTIONS.map(c => (
              <option key={c}>{c}</option>
            ))}
          </select>
        )}
      </Field>
      <Field label="Year established">
        {id => (
          <input id={id} disabled={readOnly} inputMode="numeric" maxLength={4} value={value.yearEstablished ?? ''} onChange={e => set({ yearEstablished: e.target.value.replace(/\D/g, '') || undefined })} placeholder="2011" className={input} />
        )}
      </Field>
      <Field label="Registered office address" wide>
        {id => (
          <textarea id={id} required disabled={readOnly} rows={3} value={value.registeredAddress} onChange={e => set({ registeredAddress: e.target.value })} className={input} />
        )}
      </Field>

      <h3 className="mt-2 font-serif text-xl text-ink sm:col-span-2">Contractor registration</h3>
      <Field label="Registered with" hint="The department you are enlisted with, e.g. CPWD, MES, HP PWD">
        {id => <input id={id} disabled={readOnly} value={value.registrationAuthority ?? ''} onChange={e => set({ registrationAuthority: e.target.value || undefined })} className={input} />}
      </Field>
      <Field label="Class and category">
        {id => <input id={id} required disabled={readOnly} value={value.registrationClass} onChange={e => set({ registrationClass: e.target.value })} placeholder="Class I (Civil)" className={input} />}
      </Field>
      <Field label="Registration / enlistment number">
        {id => <input id={id} disabled={readOnly} value={value.registrationNumber ?? ''} onChange={e => set({ registrationNumber: e.target.value || undefined })} className={input} />}
      </Field>
      <Field label="Valid up to">
        {id => <input id={id} type="date" disabled={readOnly} value={value.registrationValidUpto ?? ''} onChange={e => set({ registrationValidUpto: e.target.value || undefined })} className={input} />}
      </Field>

      <h3 className="mt-2 font-serif text-xl text-ink sm:col-span-2">Who signs the bid</h3>
      <Field label="Authorised signatory">
        {id => <input id={id} disabled={readOnly} value={value.signatoryName ?? ''} onChange={e => set({ signatoryName: e.target.value || undefined })} className={input} />}
      </Field>
      <Field label="Designation">
        {id => <input id={id} disabled={readOnly} value={value.signatoryDesignation ?? ''} onChange={e => set({ signatoryDesignation: e.target.value || undefined })} placeholder="Director" className={input} />}
      </Field>
      <Field label="Email for tender correspondence">
        {id => <input id={id} type="email" disabled={readOnly} value={value.contactEmail ?? ''} onChange={e => set({ contactEmail: e.target.value || undefined })} className={input} />}
      </Field>
      <Field label="Phone">
        {id => <input id={id} type="tel" disabled={readOnly} value={value.contactPhone ?? ''} onChange={e => set({ contactPhone: e.target.value || undefined })} className={input} />}
      </Field>
    </div>
  );
}

export function FinanceSection({ value, onChange, readOnly }: SectionProps) {
  const turnover = value.turnover?.length ? value.turnover : emptyTurnover();
  const setYear = (i: number, lakh: number | null) => onChange({ ...value, turnover: turnover.map((t, j) => (j === i ? { ...t, lakh } : t)) });
  const filled = turnover.filter(t => t.lakh != null);
  const lastThree = turnover.slice(0, 3).filter(t => t.lakh != null);
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-ink-soft">
        Enter figures in ₹ lakh, as on your CA-certified turnover certificate (100 lakh = 1 crore). They fill the
        eligibility proforma and the bid capacity calculation.
      </p>
      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium text-ink-soft">Value of works executed (turnover), last five years</legend>
        {turnover.map((t, i) => (
          <Field key={t.year} label={`FY ${t.year}`}>
            {id => <LakhInput id={id} value={t.lakh} disabled={readOnly} onChange={v => setYear(i, v)} />}
          </Field>
        ))}
        {lastThree.length === 3 && (
          <p className="text-sm text-ink-soft">
            Average of the last three years: <span className="font-mono">{formatLakh(lastThree.reduce((s, t) => s + t.lakh!, 0) / 3)}</span>
          </p>
        )}
        {filled.length > 0 && filled.length < turnover.length && (
          <p className="text-xs text-muted">Leave a year blank if the company did not exist then.</p>
        )}
      </fieldset>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Field label="Solvency certificate amount" hint="From your bank's solvency certificate">
          {id => <LakhInput id={id} value={value.solvencyLakh} disabled={readOnly} onChange={v => onChange({ ...value, solvencyLakh: v })} />}
        </Field>
        <Field label="Works in hand, still to be done" hint="Value of work left on contracts you hold today (B in bid capacity)">
          {id => <LakhInput id={id} value={value.worksInHandLakh} disabled={readOnly} onChange={v => onChange({ ...value, worksInHandLakh: v })} />}
        </Field>
      </div>
    </div>
  );
}

const NEW_WORK: SimilarWork = { name: '', client: '', valueLakh: null, start: '', completion: '' };

export function ExperienceSection({ value, onChange, readOnly }: SectionProps) {
  const works = value.similarWorks?.length ? value.similarWorks : [NEW_WORK];
  const setWork = (i: number, patch: Partial<SimilarWork>) => onChange({ ...value, similarWorks: works.map((w, j) => (j === i ? { ...w, ...patch } : w)) });
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-ink-soft">
        Completed works you can show a completion certificate for. Tenders usually ask for three similar works of
        40%, two of 50% or one of 80% of the estimated cost, so list your largest first.
      </p>
      {works.map((w, i) => (
        <fieldset key={`${i}-${works.length}`} className="grid grid-cols-1 gap-4 border-t border-dotted border-rule-strong pt-5 sm:grid-cols-2">
          <legend className="sr-only">Work {i + 1}</legend>
          <Field label={`Work ${i + 1}: name of work`} wide>
            {id => <input id={id} disabled={readOnly} value={w.name} onChange={e => setWork(i, { name: e.target.value })} className={input} />}
          </Field>
          <Field label="Client department">
            {id => <input id={id} disabled={readOnly} value={w.client} onChange={e => setWork(i, { client: e.target.value })} className={input} />}
          </Field>
          <Field label="Value of work done">
            {id => <LakhInput id={id} value={w.valueLakh} disabled={readOnly} onChange={v => setWork(i, { valueLakh: v })} />}
          </Field>
          <Field label="Started (mm/yyyy)">
            {id => <input id={id} disabled={readOnly} value={w.start} onChange={e => setWork(i, { start: e.target.value })} placeholder="04/2021" className={input} />}
          </Field>
          <Field label="Completed (mm/yyyy)">
            {id => <input id={id} disabled={readOnly} value={w.completion} onChange={e => setWork(i, { completion: e.target.value })} placeholder="09/2022" className={input} />}
          </Field>
          {!readOnly && works.length > 1 && (
            <div className="sm:col-span-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => onChange({ ...value, similarWorks: works.filter((_, j) => j !== i) })}>
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove work {i + 1}
              </Button>
            </div>
          )}
        </fieldset>
      ))}
      {!readOnly && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, similarWorks: [...works, NEW_WORK] })}>
            <Plus className="h-4 w-4" aria-hidden /> Add another work
          </Button>
        </div>
      )}
    </div>
  );
}

const NEW_STAFF: KeyStaff = { name: '', qualification: '', years: null };

export function TeamSection({ value, onChange, readOnly }: SectionProps) {
  const staff = value.keyStaff?.length ? value.keyStaff : [NEW_STAFF];
  const setStaff = (i: number, patch: Partial<KeyStaff>) => onChange({ ...value, keyStaff: staff.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm leading-relaxed text-ink-soft">
        The engineers you will deploy and the plant you own or have on lease. Most works tenders ask for both.
      </p>
      {staff.map((s, i) => (
        <fieldset key={`${i}-${staff.length}`} className="grid grid-cols-1 gap-4 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
          <legend className="sr-only">Staff member {i + 1}</legend>
          <Field label="Name">
            {id => <input id={id} disabled={readOnly} value={s.name} onChange={e => setStaff(i, { name: e.target.value })} className={input} />}
          </Field>
          <Field label="Qualification">
            {id => <input id={id} disabled={readOnly} value={s.qualification} onChange={e => setStaff(i, { qualification: e.target.value })} placeholder="B.E. Civil" className={input} />}
          </Field>
          <Field label="Years">
            {id => (
              <input
                id={id}
                disabled={readOnly}
                inputMode="numeric"
                value={s.years ?? ''}
                onChange={e => setStaff(i, { years: e.target.value ? Number(e.target.value.replace(/\D/g, '')) : null })}
                className={`${input} font-mono`}
              />
            )}
          </Field>
          {!readOnly && staff.length > 1 ? (
            <Button type="button" variant="ghost" size="md" aria-label={`Remove staff member ${i + 1}`} onClick={() => onChange({ ...value, keyStaff: staff.filter((_, j) => j !== i) })}>
              <Trash2 className="h-4 w-4" aria-hidden />
            </Button>
          ) : (
            <span aria-hidden className="hidden w-11 sm:block" />
          )}
        </fieldset>
      ))}
      {!readOnly && (
        <div>
          <Button type="button" variant="outline" size="sm" onClick={() => onChange({ ...value, keyStaff: [...staff, NEW_STAFF] })}>
            <Plus className="h-4 w-4" aria-hidden /> Add a staff member
          </Button>
        </div>
      )}
      <Field label="Plant and machinery" hint="One item per line, e.g. Concrete batching plant 30 cum/hr (owned)">
        {id => <textarea id={id} disabled={readOnly} rows={5} value={value.machinery ?? ''} onChange={e => onChange({ ...value, machinery: e.target.value || undefined })} className={input} />}
      </Field>
    </div>
  );
}

/** Drops the empty rows a form starts with, so a skipped step saves nothing. */
export function tidyProfile(p: CompanyProfile): CompanyProfile {
  return {
    ...p,
    turnover: p.turnover?.some(t => t.lakh != null) ? p.turnover : undefined,
    similarWorks: p.similarWorks?.filter(w => w.name.trim()).length ? p.similarWorks.filter(w => w.name.trim()) : undefined,
    keyStaff: p.keyStaff?.filter(s => s.name.trim()).length ? p.keyStaff.filter(s => s.name.trim()) : undefined,
  };
}
