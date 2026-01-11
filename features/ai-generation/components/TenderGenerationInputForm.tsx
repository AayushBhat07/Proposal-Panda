'use client';

/**
 * Tender Generation Input Form
 * Collects prerequisite data for tender generation
 */

import { useState } from 'react';
import type { TenderInputForm } from '../types/chapterGeneration.types';
import Button from '@/components/ui/Button';

interface TenderGenerationInputFormProps {
  initialData?: TenderInputForm | null;
  onSubmit: (data: TenderInputForm) => void;
  isSubmitting?: boolean;
}

export default function TenderGenerationInputForm({
  initialData,
  onSubmit,
  isSubmitting = false,
}: TenderGenerationInputFormProps) {
  const [formData, setFormData] = useState<TenderInputForm>(
    initialData || {
      nameOfWork: '',
      authority: '',
      location: '',
      estimatedCost: 0,
      timeForCompletion: 12,
      contractType: 'Item Rate',
      emd: 0,
      securityDepositPercent: 10,
      contractorClass: '',
      state: 'Maharashtra',
    }
  );

  const [errors, setErrors] = useState<Partial<Record<keyof TenderInputForm, string>>>({});

  const handleChange = (
    field: keyof TenderInputForm,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TenderInputForm, string>> = {};

    if (!formData.nameOfWork.trim()) {
      newErrors.nameOfWork = 'Name of work is required';
    }
    if (!formData.authority.trim()) {
      newErrors.authority = 'Authority is required';
    }
    if (!formData.location.trim()) {
      newErrors.location = 'Location is required';
    }
    if (formData.estimatedCost <= 0) {
      newErrors.estimatedCost = 'Estimated cost must be greater than 0';
    }
    if (formData.timeForCompletion <= 0) {
      newErrors.timeForCompletion = 'Time for completion must be greater than 0';
    }
    if (formData.emd < 0) {
      newErrors.emd = 'EMD cannot be negative';
    }
    if (formData.securityDepositPercent < 0 || formData.securityDepositPercent > 100) {
      newErrors.securityDepositPercent = 'Security deposit must be between 0 and 100';
    }
    if (!formData.contractorClass.trim()) {
      newErrors.contractorClass = 'Contractor class is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Name of Work */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Name of Work <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.nameOfWork}
            onChange={(e) => handleChange('nameOfWork', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Construction of 2-lane road from Point A to Point B"
          />
          {errors.nameOfWork && (
            <p className="mt-1 text-sm text-red-600">{errors.nameOfWork}</p>
          )}
        </div>

        {/* Authority */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Authority / Department <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.authority}
            onChange={(e) => handleChange('authority', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Public Works Department"
          />
          {errors.authority && (
            <p className="mt-1 text-sm text-red-600">{errors.authority}</p>
          )}
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Location <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Mumbai, Maharashtra"
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location}</p>
          )}
        </div>

        {/* Estimated Cost */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Estimated Cost (Rs.) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.estimatedCost}
            onChange={(e) => handleChange('estimatedCost', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 50000000"
            min="0"
            step="1000"
          />
          {errors.estimatedCost && (
            <p className="mt-1 text-sm text-red-600">{errors.estimatedCost}</p>
          )}
        </div>

        {/* Time for Completion */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time for Completion (months) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.timeForCompletion}
            onChange={(e) => handleChange('timeForCompletion', parseInt(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 12"
            min="1"
          />
          {errors.timeForCompletion && (
            <p className="mt-1 text-sm text-red-600">{errors.timeForCompletion}</p>
          )}
        </div>

        {/* Contract Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contract Type <span className="text-red-500">*</span>
          </label>
          <select
            value={formData.contractType}
            onChange={(e) => handleChange('contractType', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="Item Rate">Item Rate</option>
            <option value="Lump Sum">Lump Sum</option>
            <option value="Percentage Rate">Percentage Rate</option>
          </select>
        </div>

        {/* EMD */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Earnest Money Deposit (Rs.) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.emd}
            onChange={(e) => handleChange('emd', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 100000"
            min="0"
            step="1000"
          />
          {errors.emd && (
            <p className="mt-1 text-sm text-red-600">{errors.emd}</p>
          )}
        </div>

        {/* Security Deposit % */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Security Deposit (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.securityDepositPercent}
            onChange={(e) => handleChange('securityDepositPercent', parseFloat(e.target.value) || 0)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 10"
            min="0"
            max="100"
            step="0.1"
          />
          {errors.securityDepositPercent && (
            <p className="mt-1 text-sm text-red-600">{errors.securityDepositPercent}</p>
          )}
        </div>

        {/* Contractor Class */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Contractor Class <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.contractorClass}
            onChange={(e) => handleChange('contractorClass', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Class I / Special Class"
          />
          {errors.contractorClass && (
            <p className="mt-1 text-sm text-red-600">{errors.contractorClass}</p>
          )}
        </div>

        {/* State */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            State <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => handleChange('state', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., Maharashtra"
          />
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t">
        <Button
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Processing...' : 'Continue to Generation'}
        </Button>
      </div>
    </form>
  );
}
