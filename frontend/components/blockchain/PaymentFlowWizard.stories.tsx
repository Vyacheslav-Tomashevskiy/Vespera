'use client';

import React from 'react';
import { PaymentFlowWizard } from './PaymentFlowWizard';

const meta = {
  title: 'Blockchain/PaymentFlowWizard',
  component: PaymentFlowWizard,
};

export default meta;

/** Mock XDR — replace with real SDK output in production */
async function mockPrepareTransaction() {
  await new Promise((r) => setTimeout(r, 400));
  return 'AAAAAgAAAAD...mockXDR...';
}

export const Demo = () => (
  <div className="max-w-md p-6 bg-slate-950 rounded-xl">
    <PaymentFlowWizard
      prepareTransaction={async ({ amount, memo }) => {
        void amount;
        void memo;
        return mockPrepareTransaction();
      }}
      onSigned={(xdr) => console.log('signed length', xdr.length)}
    />
  </div>
);
