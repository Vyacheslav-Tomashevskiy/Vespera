'use client';

import React from 'react';
import { Check } from 'lucide-react';
import { useWizardStore } from '@/store/wizard-store';

const STEPS = [
  'Basic Info',
  'Pricing & Terms',
  'Amenities',
  'House Rules',
  'Photos',
  'Description',
  'Availability',
  'Preview',
];

export const WizardProgressIndicator: React.FC = () => {
  const { currentStep, completedSteps, setCurrentStep } = useWizardStore();

  const handleStepClick = (step: number) => {
    if (completedSteps.includes(step) || step === currentStep) {
      setCurrentStep(step);
    }
  };

  return (
    <nav className="w-full">
      {/* Desktop View */}
      <div className="hidden md:flex items-center justify-between w-full max-w-4xl mx-auto px-4">
        {STEPS.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = stepNumber === currentStep;
          const isCompleted = completedSteps.includes(stepNumber);
          const isClickable = isCompleted || isActive;

          return (
            <React.Fragment key={label}>
              <div 
                className={`flex flex-col items-center group cursor-${isClickable ? 'pointer' : 'default'}`}
                onClick={() => handleStepClick(stepNumber)}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300
                    ${isActive ? 'bg-brand-blue border-brand-blue text-white shadow-lg' : 
                      isCompleted ? 'bg-green-500 border-green-500 text-white' : 
                      'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-400'}`}
                >
                  {isCompleted ? <Check size={20} /> : stepNumber}
                </div>
                <span className={`text-[10px] uppercase tracking-wider font-semibold mt-2 transition-all
                  ${isActive ? 'text-brand-blue' : isCompleted ? 'text-green-500' : 'text-neutral-400'}`}>
                  {label}
                </span>
              </div>
              {index < STEPS.length - 1 && (
                <div 
                  className={`flex-1 h-[2px] mb-6 mx-2 transition-all duration-500
                    ${isCompleted ? 'bg-green-500' : 'bg-neutral-200 dark:bg-neutral-700'}`} 
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Mobile View */}
      <div className="md:hidden flex flex-col items-center bg-white dark:bg-neutral-800 p-4 border-b border-neutral-100 dark:border-neutral-700">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-brand-blue uppercase">Step {currentStep} of 8</span>
          <span className="text-neutral-300 dark:text-neutral-600">|</span>
          <span className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">{STEPS[currentStep - 1]}</span>
        </div>
        <div className="w-full bg-neutral-100 dark:bg-neutral-700 h-1 mt-3 rounded-full overflow-hidden">
          <div 
            className="bg-brand-blue h-full transition-all duration-300"
            style={{ width: `${(currentStep / 8) * 100}%` }}
          />
        </div>
      </div>
    </nav>
  );
};
