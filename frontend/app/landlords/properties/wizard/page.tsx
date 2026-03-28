'use client';

import React from 'react';
import { PropertyListingWizard } from '@/components/wizard/PropertyListingWizard';
import { useParams } from 'next/navigation';

export default function WizardPage() {
  const params = useParams();
  const id = params?.id as string | undefined;

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 min-h-screen">
      <PropertyListingWizard draftId={id} />
    </div>
  );
}
