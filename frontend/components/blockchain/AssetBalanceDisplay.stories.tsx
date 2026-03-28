'use client';

import React from 'react';
import { AssetBalanceDisplay } from './AssetBalanceDisplay';
import type { StellarBalanceRow } from '@/lib/stellar-horizon';

const meta = {
  title: 'Blockchain/AssetBalanceDisplay',
  component: AssetBalanceDisplay,
};

export default meta;

const rows: StellarBalanceRow[] = [
  { label: 'XLM', amount: '1234.5678901', assetType: 'native' },
  {
    label: 'USDC:GABC…WXYZ',
    amount: '500.0000000',
    assetType: 'credit_alphanum4',
  },
];

export const WithBalances = () => (
  <div className="max-w-md p-6 bg-slate-950 rounded-xl">
    <AssetBalanceDisplay balances={rows} />
  </div>
);

export const Loading = () => (
  <div className="max-w-md p-6 bg-slate-950 rounded-xl">
    <AssetBalanceDisplay balances={[]} loading />
  </div>
);

export const ErrorState = () => (
  <div className="max-w-md p-6 bg-slate-950 rounded-xl">
    <AssetBalanceDisplay balances={[]} error="Horizon unavailable" />
  </div>
);
