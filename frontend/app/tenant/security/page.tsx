'use client';
import { ShieldCheck } from 'lucide-react';

export default function TenantSecurityPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">
        Account Security & MFA
      </h1>
      <p className="text-slate-300 mb-8">
        Manage your two-factor authentication parameters and signed-in devices.
      </p>

      <div className="bg-slate-800/50 border border-emerald-500/20 rounded-2xl p-6 shadow-xl mb-6">
        <div className="flex items-start gap-4">
          <div className="bg-emerald-500/20 p-3 rounded-full">
            <ShieldCheck className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white mb-1">
              Your account is secured
            </h3>
            <p className="text-slate-400 text-sm mb-4">
              No suspicious logins detected. Password updated 30 days ago.
            </p>
            <button className="text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors">
              Review security log →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
