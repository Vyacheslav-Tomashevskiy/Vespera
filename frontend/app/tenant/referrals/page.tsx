'use client';
import { Share2 } from 'lucide-react';

export default function TenantReferralsPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-white mb-6">Referrals</h1>
      <p className="text-slate-300 mb-8">
        Share the platform with friends and agents to earn rewards and credits
        toward your account!
      </p>

      <div className="bg-gradient-to-br from-slate-800 to-indigo-900/50 border border-indigo-500/30 rounded-2xl p-8 shadow-2xl text-center relative overflow-hidden">
        <Share2 className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
        <h3 className="text-2xl font-bold text-white mb-3">
          Earn $50 immediately
        </h3>
        <p className="text-blue-200/80 max-w-md mx-auto mb-8">
          Refer a landlord or friend to the housing protocol and you both will
          receive a bonus applied to your upcoming transactions.
        </p>

        <div className="bg-slate-900/60 rounded-xl p-4 flex items-center justify-between max-w-sm mx-auto border border-white/10">
          <code className="text-emerald-400 font-mono tracking-widest text-lg ml-2">
            CH-REF-2026
          </code>
          <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm transition-all focus:ring-2 focus:ring-blue-500">
            Copy Link
          </button>
        </div>
      </div>
    </div>
  );
}
