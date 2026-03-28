'use client';

import React from 'react';
import { WalletConnectButton } from './WalletConnectButton';

const meta = {
  title: 'Blockchain/WalletConnectButton',
  component: WalletConnectButton,
};

export default meta;

export const Default = () => (
  <div className="min-h-[120px] p-6 bg-slate-950 rounded-xl">
    <WalletConnectButton />
  </div>
);

export const Large = () => (
  <div className="min-h-[120px] p-6 bg-slate-950 rounded-xl">
    <WalletConnectButton size="lg" />
  </div>
);
