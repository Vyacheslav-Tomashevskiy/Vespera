'use client';

import React, { use } from 'react';
import { PropertyListingWizard } from '@/components/wizard/PropertyListingWizard';

export default function ResumeWizardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 min-h-screen">
      <PropertyListingWizard draftId={id} />
    </div>
  );
}
