'use client';

import React, { useState } from 'react';
import { PropertyData } from '@/store/wizard-store';
import {
  FileText,
  Sparkles,
  Loader2,
  Info,
  MapPin,
  Bus,
  LayoutGrid,
} from 'lucide-react';
import axios from 'axios';
import { useWizardStore } from '@/store/wizard-store';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

export const Step6Description: React.FC<StepProps> = ({
  data,
  onChange,
  errors,
}) => {
  const { draftId } = useWizardStore();
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    [key: string]: unknown;
  } | null>(null);

  const handleChange = (field: keyof PropertyData, value: unknown) => {
    onChange({ [field]: value });
  };

  const getAiSuggestion = async () => {
    if (!draftId) return;
    setIsAiLoading(true);
    try {
      const res = await axios.get(
        `/api/property-listings/wizard/${draftId}/ai/description-suggestion`,
      );
      if (res.data.available) {
        setAiSuggestion(res.data);
      }
    } catch (err) {
      console.error('AI Suggestion failed:', err);
    } finally {
      setIsAiLoading(false);
    }
  };

  const applySuggestion = (
    field: 'propertyDescription' | 'neighborhoodDescription',
  ) => {
    if (aiSuggestion) {
      onChange({ [field]: aiSuggestion[field] });
    }
  };

  return (
    <div className="space-y-10 animate-slide-in">
      <div className="flex items-center justify-between mb-2">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100">
          <FileText className="mr-3 text-brand-blue" />
          Property Story
        </label>

        <button
          onClick={getAiSuggestion}
          disabled={isAiLoading}
          className="flex items-center space-x-2 text-xs font-bold text-brand-blue bg-brand-blue/5 hover:bg-brand-blue/10 px-6 py-2.5 rounded-full transition-all active:scale-95 shadow-sm"
        >
          {isAiLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Sparkles size={16} />
          )}
          <span>Generate with AI</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-10">
        {/* Main Description */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 flex items-center">
              <Info className="mr-2 text-brand-blue" size={16} /> Property
              Description (Required)
            </span>
            <span
              className={`text-[10px] font-bold p-1 rounded-md px-2 ${(data.propertyDescription?.length || 0) < 50 ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}
            >
              {data.propertyDescription?.length || 0} / 2000
            </span>
          </div>

          <div className="relative group">
            <textarea
              placeholder="Tell us what makes this property special..."
              value={data.propertyDescription || ''}
              onChange={(e) =>
                handleChange('propertyDescription', e.target.value)
              }
              className={`w-full min-h-[160px] p-6 bg-neutral-50 dark:bg-neutral-800 border-2 rounded-3xl focus:outline-none focus:ring-4 transition-all resize-none
                ${errors.propertyDescription ? 'border-red-300 focus:border-red-500 focus:ring-red-100' : 'border-transparent focus:border-brand-blue focus:ring-brand-blue/10'}`}
            />
            {Boolean(aiSuggestion?.propertyDescription) && (
              <div className="absolute top-2 right-2 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => applySuggestion('propertyDescription')}
                  className="bg-brand-blue text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg"
                >
                  Apply AI Idea
                </button>
              </div>
            )}
          </div>
          {errors.propertyDescription && (
            <span className="text-xs text-red-500 font-medium">
              {errors.propertyDescription}
            </span>
          )}
        </div>

        {/* Neighborhood Description */}
        <div className="space-y-4 pt-6 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 flex items-center">
              <MapPin className="mr-2 text-brand-green" size={16} /> The
              Neighborhood (Optional)
            </span>
            <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-tighter">
              {data.neighborhoodDescription?.length || 0} / 1000
            </span>
          </div>
          <div className="relative group">
            <textarea
              placeholder="What do people love about living here?"
              value={data.neighborhoodDescription || ''}
              onChange={(e) =>
                handleChange('neighborhoodDescription', e.target.value)
              }
              className="w-full min-h-[120px] p-6 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-3xl resize-none transition-all"
            />
            {Boolean(aiSuggestion?.neighborhoodDescription) && (
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => applySuggestion('neighborhoodDescription')}
                  className="bg-brand-green text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg"
                >
                  Apply AI Idea
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Transportation & Nearby */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-6">
          <div className="space-y-4">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 flex items-center">
              <Bus className="mr-2 text-brand-orange" size={16} />{' '}
              Transportation Info
            </span>
            <textarea
              placeholder="Nearest subway, bus stops..."
              value={data.transportationInfo || ''}
              onChange={(e) =>
                handleChange('transportationInfo', e.target.value)
              }
              className="w-full min-h-[100px] p-5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl resize-none transition-all"
            />
          </div>

          <div className="space-y-4">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400 flex items-center">
              <LayoutGrid className="mr-2 text-brand-blue" size={16} /> Nearby
              Amenities
            </span>
            <textarea
              placeholder="Grocery stores, parks, schools..."
              value={data.nearbyAmenities || ''}
              onChange={(e) => handleChange('nearbyAmenities', e.target.value)}
              className="w-full min-h-[100px] p-5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl resize-none transition-all"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
