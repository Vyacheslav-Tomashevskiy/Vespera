'use client';

import React from 'react';
import { PropertyData } from '@/store/wizard-store';
import { Home, MapPin, Bed, Bath, Triangle, Calendar } from 'lucide-react';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

export const Step1BasicInfo: React.FC<StepProps> = ({ data, onChange, errors }) => {
  const propertyTypes = ['Apartment', 'House', 'Room', 'Studio', 'Duplex', 'Other'];

  const handleChange = (field: keyof PropertyData, value: any) => {
    onChange({ [field]: value });
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex flex-col space-y-4">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100 mb-6">
          <Home className="mr-3 text-brand-blue" />
          Property Basics
        </label>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Property Type */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Property Type</span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {propertyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleChange('propertyType', type.toLowerCase())}
                  className={`px-4 py-3 rounded-xl border text-sm font-medium transition-all transform active:scale-95
                    ${data.propertyType === type.toLowerCase()
                      ? 'bg-brand-blue/10 border-brand-blue text-brand-blue shadow-sm'
                      : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:border-neutral-300 dark:hover:border-neutral-600'}`}
                >
                  {type}
                </button>
              ))}
            </div>
            {errors.propertyType && <span className="text-xs text-red-500 font-medium">{errors.propertyType}</span>}
          </div>

          {/* Address */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Street Address</span>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 transition-colors group-focus-within:text-brand-blue">
                <MapPin size={18} />
              </div>
              <input
                type="text"
                placeholder="Ex. 123 Main St, New York"
                value={data.address || ''}
                onChange={(e) => handleChange('address', e.target.value)}
                className={`w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-2 rounded-2xl focus:outline-none focus:ring-4 transition-all
                  ${errors.address
                    ? 'border-red-300 dark:border-red-900/50 focus:border-red-500 focus:ring-red-100 dark:focus:ring-red-900/20'
                    : 'border-transparent focus:border-brand-blue focus:ring-brand-blue/10'}`}
              />
            </div>
            {errors.address && <span className="text-xs text-red-500 font-medium">{errors.address}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
          {/* Bedrooms */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Bedrooms</span>
            <div className="relative">
              <Bed className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="number"
                min="0"
                value={data.bedrooms ?? ''}
                onChange={(e) => handleChange('bedrooms', parseInt(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl"
              />
            </div>
          </div>

          {/* Bathrooms */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Bathrooms</span>
            <div className="relative">
              <Bath className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="number"
                min="0"
                value={data.bathrooms ?? ''}
                onChange={(e) => handleChange('bathrooms', parseInt(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl"
              />
            </div>
          </div>

          {/* Square Footage */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Sq. Footage</span>
            <div className="relative">
              <Triangle className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 rotate-90" size={16} />
              <input
                type="number"
                min="0"
                value={data.squareFootage ?? ''}
                onChange={(e) => handleChange('squareFootage', parseInt(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl"
              />
            </div>
          </div>

          {/* Year Built */}
          <div className="space-y-2">
            <span className="text-sm font-semibold text-neutral-600 dark:text-neutral-400">Year Built</span>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
              <input
                type="number"
                min="1800"
                max={new Date().getFullYear()}
                value={data.yearBuilt ?? ''}
                onChange={(e) => handleChange('yearBuilt', parseInt(e.target.value) || 0)}
                className="w-full pl-12 pr-4 py-3.5 bg-neutral-50 dark:bg-neutral-800 border-transparent border-2 focus:border-brand-blue focus:ring-4 focus:ring-brand-blue/10 rounded-2xl"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
