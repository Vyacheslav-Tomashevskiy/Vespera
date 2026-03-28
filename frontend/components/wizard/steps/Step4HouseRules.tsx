'use client';

import React from 'react';
import { PropertyData } from '@/store/wizard-store';
import {
  ShieldCheck,
  PawPrint,
  Wind,
  Volume2,
  UserPlus,
  Users,
} from 'lucide-react';

interface StepProps {
  data: PropertyData;
  onChange: (data: Partial<PropertyData>) => void;
  errors: Record<string, string>;
}

const RULES = [
  {
    id: 'petsAllowed',
    label: 'Pets Allowed',
    icon: <PawPrint size={20} />,
    description: 'Small pets or specific breeds allowed',
  },
  {
    id: 'smokingAllowed',
    label: 'Smoking Allowed',
    icon: <Wind size={20} />,
    description: 'Designated smoking areas available',
  },
  {
    id: 'quietHours',
    label: 'Quiet Hours',
    icon: <Volume2 size={20} />,
    description: 'General noise restriction after 10 PM',
  },
  {
    id: 'partiesAllowed',
    label: 'Parties Allowed',
    icon: <Users size={20} />,
    description: 'Occasional social gatherings are fine',
  },
  {
    id: 'sublettingAllowed',
    label: 'Subletting Allowed',
    icon: <UserPlus size={20} />,
    description: 'Permission required before subletting',
  },
];

export const Step4HouseRules: React.FC<StepProps> = ({ data, onChange }) => {
  const toggleRule = (id: string) => {
    const current = data.houseRules || {};
    onChange({
      houseRules: {
        ...current,
        [id]: !current[id],
      },
    });
  };

  return (
    <div className="space-y-8 animate-slide-in">
      <div className="flex flex-col space-y-4">
        <label className="text-xl font-bold flex items-center text-neutral-900 dark:text-neutral-100 mb-6">
          <ShieldCheck className="mr-3 text-brand-blue" />
          House Rules & Policies
        </label>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {RULES.map((rule) => {
            const isEnabled = data.houseRules?.[rule.id] || false;
            return (
              <div
                key={rule.id}
                onClick={() => toggleRule(rule.id)}
                className={`group flex items-center p-5 rounded-2xl border-2 cursor-pointer select-none transition-all
                  ${
                    isEnabled
                      ? 'border-brand-blue bg-brand-blue/5 shadow-sm'
                      : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800 hover:border-neutral-200 dark:hover:border-neutral-700'
                  }`}
              >
                <div
                  className={`mr-4 p-3 rounded-xl transition-all
                  ${isEnabled ? 'bg-brand-blue text-white' : 'bg-neutral-100 dark:bg-neutral-700 text-neutral-400'}`}
                >
                  {rule.icon}
                </div>

                <div className="flex-1">
                  <h3
                    className={`text-sm font-bold transition-all ${isEnabled ? 'text-brand-blue' : 'text-neutral-800 dark:text-neutral-200'}`}
                  >
                    {rule.label}
                  </h3>
                  <p className="text-xs text-neutral-500 mt-0.5">
                    {rule.description}
                  </p>
                </div>

                <div
                  className={`w-12 h-6 rounded-full relative transition-all duration-300
                  ${isEnabled ? 'bg-brand-blue shadow-inner' : 'bg-neutral-200 dark:bg-neutral-700'}`}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300
                    ${isEnabled ? 'left-7' : 'left-1'}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
