'use client';

import React, { useState } from 'react';
import { PropertyData } from '@/store/wizard-store';
import { DollarSign, Calendar, Zap, Sparkles, Loader2 } from 'lucide-react';
import axios from 'axios';
import { useWizardStore } from '@/store/wizard-store';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

export const Step2PricingTerms: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const { draftId } = useWizardStore();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{ [key: string]: unknown } | null>(null);

  const leaseTerms = ['Month-to-month', '6-months', '1-year', '2-years', 'Other'];
  const utilities = ['Water', 'Electricity', 'Gas', 'Internet', 'Trash'];

  const handleChange = (field: keyof PropertyData, value: unknown) => {
    onChange({ [field]: value });
  };

  const toggleUtility = (utility: string) => {
    const current = data.utilitiesIncluded || [];
    if (current.includes(utility)) {
      handleChange('utilitiesIncluded', current.filter(u => u !== utility));
    } else {
      handleChange('utilitiesIncluded', [...current, utility]);
    }
  };

  const getAiSuggestion = async () => {
    if (!draftId) return;
    setIsAiLoading(true);
    try {
      const res = await axios.get(`/api/property-listings/wizard/${draftId}/ai/pricing-suggestion`);
      if (res.data.available) {
        setAiSuggestion(res.data);
      }
    } catch (err) {
      console.error('AI Suggestion failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const useSuggestion = () => {
    if (aiSuggestion) {
      onChange({
        monthlyRent: Number(((aiSuggestion as unknown as Record<string, unknown>).suggestedRent as unknown as Record<string, unknown>)?.min),
        securityDeposit: Number(((aiSuggestion as unknown as Record<string, unknown>).suggestedDeposit as unknown as Record<string, unknown>)?.min),
      });
      setAiSuggestion(null);
    }
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex items-center justify-between mb-6">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100">
          <DollarSign className="mr-3 text-brand-blue" />
          Pricing & Terms
        </label>
        
        <button
          onClick={getAiSuggestion}
          disabled={isAiLoading}
          className="flex items-center space-x-2 text-xs font-bold text-brand-blue bg-brand-blue/5 hover:bg-brand-blue/10 px-4 py-2 rounded-full transition-all active:scale-95"
        >
          {isAiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          <span>Get AI Price Suggestion</span>
        </button>
      </div>

      {aiSuggestion && (
        <div className="bg-brand-blue/5 border border-brand-blue/20 rounded-2xl p-4 mb-6 animate-slide-in flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start space-x-3">
            <div className="bg-brand-blue p-2 rounded-lg text-white">
              <Sparkles size={20} />
            </div>
            <div>
              <p className="text-sm font-bold text-brand-blue">AI Recommendation</p>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                Suggested Rent: <span className="font-bold">${Number(((aiSuggestion as unknown as Record<string, unknown>).suggestedRent as unknown as Record<string, unknown>)?.min)} - ${Number(((aiSuggestion as unknown as Record<string, unknown>).suggestedRent as unknown as Record<string, unknown>)?.max)}</span>. 
                {String((aiSuggestion as unknown as Record<string, unknown>).reasoning)}
              </p>
            </div>
          </div>
          <button 
            onClick={useSuggestion}
            className="whitespace-nowrap bg-brand-blue text-white text-xs font-bold px-4 py-2 rounded-xl transition-all hover:bg-brand-blue-dark active:scale-95 shadow-md shadow-brand-blue/20"
          >
            Use Suggestion
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Monthly Rent */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Monthly Rent</span>
          <div className="relative group">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="number"
              min="1"
              step="1"
              value={data.monthlyRent ?? ''}
              onChange={(e) => handleChange('monthlyRent', parseFloat(e.target.value) || 0)}
              className={`w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all
                ${errors.monthlyRent ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-transparent focus:border-brand-blue focus:ring-brand-blue/10'}`}
            />
          </div>
          {errors.monthlyRent && <span className="text-xs text-red-500 font-medium">{errors.monthlyRent}</span>}
        </div>

        {/* Security Deposit */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Security Deposit</span>
          <div className="relative">
            <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="number"
              min="0"
              value={data.securityDeposit ?? ''}
              onChange={(e) => handleChange('securityDeposit', parseFloat(e.target.value) || 0)}
              className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl"
            />
          </div>
        </div>

        {/* Lease Term */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Lease Term</span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {leaseTerms.map((term) => (
              <button
                key={term}
                onClick={() => handleChange('leaseTerm', term.toLowerCase())}
                className={`px-3 py-3 rounded-xl border text-xs font-bold transition-all
                  ${data.leaseTerm === term.toLowerCase()
                    ? 'bg-brand-blue border-brand-blue text-white shadow-lg'
                    : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300'}`}
              >
                {term}
              </button>
            ))}
          </div>
        </div>

        {/* Move-in Date */}
        <div className="space-y-2">
          <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Available From / Move-in Date</span>
          <div className="relative">
            <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={data.moveInDate || ''}
              onChange={(e) => handleChange('moveInDate', e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl appearance-none"
            />
          </div>
        </div>
      </div>

      {/* Utilities */}
      <div className="space-y-4 pt-4 border-t border-neutral-100 dark:border-neutral-800">
        <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 flex items-center">
          <Zap className="mr-2 text-brand-orange" size={16} /> Utilities Included In Rent
        </span>
        <div className="flex flex-wrap gap-3">
          {utilities.map((utility) => {
            const isSelected = data.utilitiesIncluded?.includes(utility);
            return (
              <button
                key={utility}
                onClick={() => toggleUtility(utility)}
                className={`px-5 py-2.5 rounded-full text-xs font-bold border-2 transition-all flex items-center
                  ${isSelected
                    ? 'bg-brand-orange border-brand-orange text-white shadow-md'
                    : 'bg-white dark:bg-neutral-800 border-neutral-100 dark:border-neutral-700 text-neutral-600 hover:border-neutral-300'}`}
              >
                {utility}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
