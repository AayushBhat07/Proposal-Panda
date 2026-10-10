'use client';

/**
 * Phase 5A: Company Info Form
 * Step 1 of onboarding - capture company details
 */

import { useState } from 'react';
import Button from '@/components/ui/Button';
import type { CompanyProfile } from '@/types/onboarding.types';

interface CompanyInfoFormProps {
  onNext: (profile: CompanyProfile) => void;
  initialData?: CompanyProfile | null;
}

export default function CompanyInfoForm({ onNext, initialData }: CompanyInfoFormProps) {
  const [formData, setFormData] = useState<CompanyProfile>(
    initialData || {
      legalName: '',
      registrationClass: '',
      registeredAddress: '',
    }
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onNext(formData);
  };

  const isValid =
    formData.legalName &&
    formData.registrationClass &&
    formData.registeredAddress;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="font-serif text-2xl text-ink mb-4">
          Maharashtra PWD Contractor Profile
        </h3>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-forest-tint border border-forest/30 rounded text-sm text-forest">
          <span>✓</span>
          <span>VERIFIED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">
            COMPANY LEGAL NAME
          </label>
          <input
            type="text"
            value={formData.legalName}
            onChange={e => setFormData({ ...formData, legalName: e.target.value })}
            placeholder="InfraBuild Constructions Pvt L"
            className="w-full min-h-11 px-3 py-2 border border-rule-strong bg-paper text-ink"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink-soft mb-2">
            REGISTRATION CLASS
          </label>
          <input
            type="text"
            value={formData.registrationClass}
            onChange={e => setFormData({ ...formData, registrationClass: e.target.value })}
            placeholder="Class I-A"
            className="w-full min-h-11 px-3 py-2 border border-rule-strong bg-paper text-ink"
          />
        </div>

        <p className="text-sm text-ink-soft sm:col-span-2">
          GSTIN and PAN go in the encrypted vault, set up after onboarding. They are never stored in the clear.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink-soft mb-2">
          REGISTERED OFFICE ADDRESS
        </label>
        <textarea
          value={formData.registeredAddress}
          onChange={e => setFormData({ ...formData, registeredAddress: e.target.value })}
          placeholder="1204, Titanium Towers, Baner Road, Pune, Maharashtra - 411045"
          rows={3}
          className="w-full min-h-11 px-3 py-2 border border-rule-strong bg-paper text-ink"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isValid}
         
        >
          Continue to Review
        </Button>
      </div>
    </form>
  );
}
