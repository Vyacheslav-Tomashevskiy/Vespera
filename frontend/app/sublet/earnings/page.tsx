'use client';

import { DollarSign, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function SubletEarningsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 text-white px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/sublet"
          className="inline-flex items-center gap-2 text-blue-300/60 hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft size={18} /> Back
        </Link>
        <h1 className="text-3xl font-bold mb-8">Sublet Earnings</h1>

        <div className="backdrop-blur-xl bg-slate-800/50 border border-white/10 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <DollarSign size={26} className="text-white" />
            </div>
            <div>
              <p className="text-3xl font-bold">$0.00</p>
              <p className="text-blue-300/60">Total sublet earnings</p>
            </div>
          </div>
        </div>

        <div className="text-center py-12 text-blue-300/60">
          <p>No earnings yet. Approve a sublet to start earning.</p>
          <Link
            href="/sublet/request"
            className="text-blue-400 hover:underline mt-2 inline-block"
          >
            Request subletting →
          </Link>
        </div>
      </div>
    </div>
  );
}
