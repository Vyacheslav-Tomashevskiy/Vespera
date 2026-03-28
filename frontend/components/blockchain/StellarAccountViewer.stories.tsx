'use client';

import React from 'react';
import { QueryProvider } from '@/lib/query/provider';
import { StellarAccountViewer } from './StellarAccountViewer';

const meta = {
  title: 'Blockchain/StellarAccountViewer',
  component: StellarAccountViewer,
};

export default meta;

export const Default = () => (
  <QueryProvider>
    <div className="max-w-lg p-6 bg-slate-950 rounded-xl">
      <StellarAccountViewer />
    </div>
  </QueryProvider>
);
