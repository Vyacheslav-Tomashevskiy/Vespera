'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useWizardStore } from '@/store/wizard-store';
import { WizardProgressIndicator } from './WizardProgressIndicator';
import { WizardNavigationButtons } from './WizardNavigationButtons';
import { Step1BasicInfo } from './steps/Step1BasicInfo';
import { Step2PricingTerms } from './steps/Step2PricingTerms';
import { Step3Amenities } from './steps/Step3Amenities';
import { Step4HouseRules } from './steps/Step4HouseRules';
import { Step5Photos } from './steps/Step5Photos';
import { Step6Description } from './steps/Step6Description';
import { Step7Availability } from './steps/Step7Availability';
import { Step8Preview } from './steps/Step8Preview';
import { Loader2, AlertCircle } from 'lucide-react';

interface PropertyListingWizardProps {
  draftId?: string;
}

export const PropertyListingWizard: React.FC<PropertyListingWizardProps> = ({ draftId }) => {
  const { currentStep, initDraft, data, updateData, validationErrors, isInitialized, saveStep } = useWizardStore();
  const [error, setError] = useState<string | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    initDraft(draftId).catch((err) => {
      if (err.response?.status === 410) {
        setError('Your draft has expired. Would you like to start a new one?');
      } else {
        setError('Failed to load draft. Please try again.');
      }
    });
  }, [draftId, initDraft]);

  // Auto-save debounce
  useEffect(() => {
    if (!isInitialized) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveStep(currentStep);
    }, 2000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [data, currentStep, isInitialized, saveStep]);

  // On page unload
  useEffect(() => {
    const handleBeforeUnload = (_e: BeforeUnloadEvent) => {
      // Synchronous save attempt is hard in modern browsers, but we can try
      saveStep(currentStep);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentStep, saveStep]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center max-w-lg mx-auto bg-white dark:bg-neutral-800 rounded-2xl shadow-xl border border-neutral-100 dark:border-neutral-700 animate-slide-in">
        <AlertCircle size={48} className="text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100 mb-2">Error Occurred</h2>
        <p className="text-neutral-500 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="bg-brand-blue hover:bg-brand-blue-dark text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg active:scale-95"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 size={48} className="animate-spin text-brand-blue" />
          <p className="text-neutral-500 font-medium">Preparing your wizard...</p>
        </div>
      </div>
    );
  }

  const renderStep = () => {
    const props = { data, onChange: updateData, errors: validationErrors };

    switch (currentStep) {
      case 1: return <Step1BasicInfo {...props} />;
      case 2: return <Step2PricingTerms {...props} />;
      case 3: return <Step3Amenities {...props} />;
      case 4: return <Step4HouseRules {...props} />;
      case 5: return <Step5Photos {...props} />;
      case 6: return <Step6Description {...props} />;
      case 7: return <Step7Availability {...props} />;
      case 8: return <Step8Preview {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 flex flex-col pt-10 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto w-full mb-8">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 sm:text-4xl mb-3 tracking-tight">
            Create Rental Property
          </h1>
          <p className="text-neutral-500 max-w-lg mx-auto">
            Fill out the details below to list your property on Chioma Protocol and start attracting top-tier tenants.
          </p>
        </header>

        <WizardProgressIndicator />
      </div>

      <main className="flex-1 w-full max-w-4xl mx-auto pb-12">
        <div className="bg-white dark:bg-neutral-900/50 backdrop-blur-md border border-neutral-100 dark:border-neutral-800 rounded-3xl p-6 sm:p-10 shadow-sm min-h-[400px]">
          {renderStep()}
        </div>
      </main>

      <WizardNavigationButtons />
    </div>
  );
};
