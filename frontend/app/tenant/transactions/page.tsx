'use client';
import { Activity } from 'lucide-react';

export default function TenantTransactionsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Transactions</h1>
      <p className="text-slate-300 mb-8">
        A comprehensive ledger of all your monetary transactions via the
        protocol.
      </p>

      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 shadow-xl text-center">
        <Activity className="w-12 h-12 text-blue-500 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          No Transactions
        </h3>
        <p className="text-slate-400">
          There are no recent payments, refunds, or credits processed internally
          on your account yet.
        </p>
      </div>
    </div>
  );
}
