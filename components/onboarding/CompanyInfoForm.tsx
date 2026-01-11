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
      gstin: '',
      panNumber: '',
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
    formData.gstin &&
    formData.panNumber &&
    formData.registeredAddress;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Maharashtra PWD Contractor Profile
        </h3>
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 border border-green-200 rounded text-sm text-green-700">
          <span>✓</span>
          <span>VERIFIED</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            COMPANY LEGAL NAME
          </label>
          <input
            type="text"
            value={formData.legalName}
            onChange={e => setFormData({ ...formData, legalName: e.target.value })}
            placeholder="InfraBuild Constructions Pvt L"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            REGISTRATION CLASS
          </label>
          <input
            type="text"
            value={formData.registrationClass}
            onChange={e => setFormData({ ...formData, registrationClass: e.target.value })}
            placeholder="Class I-A"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
          <input
            type="text"
            value={formData.gstin}
            onChange={e => setFormData({ ...formData, gstin: e.target.value })}
            placeholder="27ABCDE1234F1Z5"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            PAN NUMBER
          </label>
          <input
            type="text"
            value={formData.panNumber}
            onChange={e => setFormData({ ...formData, panNumber: e.target.value })}
            placeholder="ABCDE1234F"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          REGISTERED OFFICE ADDRESS
        </label>
        <textarea
          value={formData.registeredAddress}
          onChange={e => setFormData({ ...formData, registeredAddress: e.target.value })}
          placeholder="1204, Titanium Towers, Baner Road, Pune, Maharashtra - 411045"
          rows={3}
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-900"
        />
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isValid}
          className="bg-amber-900 hover:bg-amber-800 text-white px-6 py-2"
        >
          Continue to Role Selection
        </Button>
      </div>
    </form>
  );
}
