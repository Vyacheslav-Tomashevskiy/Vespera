'use client';

import React, { useState } from 'react';
import { TransactionSigningModal } from './TransactionSigningModal';

const meta = {
  title: 'Blockchain/TransactionSigningModal',
  component: TransactionSigningModal,
};

export default meta;

const MOCK_XDR = 'AAAAAgAAAAA=' + 'A'.repeat(80) + 'AAAAAA==';

export const Open = () => {
  const [open, setOpen] = useState(true);
  return (
    <div className="min-h-[200px] p-6 bg-slate-950 rounded-xl">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl bg-white/10 text-white"
      >
        Open modal
      </button>
      <TransactionSigningModal
        isOpen={open}
        onClose={() => setOpen(false)}
        transactionXdr={MOCK_XDR}
      />
    </div>
  );
};
