'use client';
import { Wrench } from 'lucide-react';

export default function TenantMaintenancePage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">
        Maintenance Requests
      </h1>
      <p className="text-slate-300 mb-8">
        Submit, track, and manage all your property repair tickets.
      </p>

      <div className="bg-slate-800/50 border border-white/10 rounded-2xl p-8 shadow-xl flex flex-col items-center">
        <Wrench className="w-12 h-12 text-yellow-500 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Submit a Request
        </h3>
        <p className="text-slate-400 mb-6 text-center max-w-sm">
          Need a repair? Let us know what the issue is and we will alert your
          property manager right away.
        </p>
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-3 rounded-lg transition-all">
          New Request
        </button>
      </div>
    </div>
  );
}
