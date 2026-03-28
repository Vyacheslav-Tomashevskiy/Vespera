'use client';

import React from 'react';
import { PropertyData } from '@/store/wizard-store';
import { LayoutGrid, CheckCircle2 } from 'lucide-react';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

const AMENITY_CATEGORIES = [
  {
    name: 'Indoor',
    items: [
      'Air Conditioning',
      'Heating',
      'Washer',
      'Dryer',
      'Dishwasher',
      'Furnished',
      'High Speed Internet',
      'Smart Home Features',
    ],
  },
  {
    name: 'Building',
    items: [
      'Elevator',
      'Gym / Fitness Center',
      'Swimming Pool',
      'Security Guard',
      'Rooftop Access',
      'Concierge',
      'Laundry Room',
    ],
  },
  {
    name: 'Outdoor & Parking',
    items: [
      'Parking Garage',
      'Attached Garage',
      'Deck / Patio',
      'Backyard',
      'Fenced Yard',
      'Bicycle Storage',
      'Garden',
    ],
  },
];

export const Step3Amenities: React.FC<StepProps> = ({ data, onChange }) => {
  const toggleAmenity = (item: string) => {
    const current = data.amenities || [];
    if (current.includes(item)) {
      onChange({ amenities: current.filter((a) => a !== item) });
    } else {
      onChange({ amenities: [...current, item] });
    }
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex flex-col space-y-4">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100 mb-6">
          <LayoutGrid className="mr-3 text-brand-blue" />
          Amenities & Features
        </label>

        <div className="space-y-10">
          {AMENITY_CATEGORIES.map((category) => (
            <div key={category.name} className="space-y-4">
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-widest px-1">
                {category.name}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {category.items.map((item) => {
                  const isSelected = data.amenities?.includes(item);
                  return (
                    <button
                      key={item}
                      onClick={() => toggleAmenity(item)}
                      className={`relative flex items-center justify-center p-4 rounded-2xl border-2 transition-all transform active:scale-95 group
                        ${
                          isSelected
                            ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                            : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-200 dark:hover:border-neutral-700 hover:bg-white dark:hover:bg-neutral-700'
                        }`}
                    >
                      <span className="text-xs font-bold text-center leading-tight">
                        {item}
                      </span>
                      {isSelected && (
                        <div className="absolute top-2 right-2 text-brand-blue">
                          <CheckCircle2 size={12} fill="white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
