'use client';

import React from 'react';
import { TransactionHistoryList } from './TransactionHistoryList';
import type { BlockchainTxRow } from './types';

const meta = {
  title: 'Blockchain/TransactionHistoryList',
  component: TransactionHistoryList,
};

export default meta;

const sample: BlockchainTxRow[] = [
  {
    id: '1',
    hash: 'a'.repeat(64),
    amount: '100.0000000',
    asset: 'XLM',
    createdAt: new Date().toISOString(),
    direction: 'in',
    memo: 'Rent March',
  },
  {
    id: '2',
    hash: 'b'.repeat(64),
    amount: '25.50',
    asset: 'USDC',
    createdAt: new Date().toISOString(),
    direction: 'out',
  },
];

export const WithRows = () => (
  <div className="max-w-xl p-6 bg-slate-950 rounded-xl">
    <TransactionHistoryList items={sample} />
  </div>
);

export const Empty = () => (
  <div className="max-w-xl p-6 bg-slate-950 rounded-xl">
    <TransactionHistoryList items={[]} />
  </div>
);

export const Loading = () => (
  <div className="max-w-xl p-6 bg-slate-950 rounded-xl">
    <TransactionHistoryList items={[]} loading />
  </div>
);
