'use client';

import React from 'react';
import { BlockchainStatusBadge } from './BlockchainStatusBadge';

const meta = {
  title: 'Blockchain/BlockchainStatusBadge',
  component: BlockchainStatusBadge,
};

export default meta;

export const AllVariants = () => (
  <div className="flex flex-wrap gap-2 p-6 bg-slate-950 rounded-xl">
    <BlockchainStatusBadge variant="network" />
    <BlockchainStatusBadge variant="connected" />
    <BlockchainStatusBadge variant="disconnected" />
    <BlockchainStatusBadge variant="pending" />
    <BlockchainStatusBadge variant="success" />
    <BlockchainStatusBadge variant="error" label="Simulation failed" />
  </div>
);
