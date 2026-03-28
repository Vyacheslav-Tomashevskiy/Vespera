'use client';

import React from 'react';
import { Zap, Target, ShieldCheck, Search } from 'lucide-react';
import { ThreatStats } from '@/types/security';

interface ThreatAnalysisProps {
  stats: ThreatStats | null;
  loading: boolean;
}

export function ThreatAnalysis({ stats, loading }: ThreatAnalysisProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="animate-pulse rounded-3xl border border-white/10 bg-white/5 h-64" />
        <div className="animate-pulse rounded-3xl border border-white/10 bg-white/5 h-64" />
      </div>
    );
  }

  const { topOffendingIps, threatsByType } = stats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-6 font-semibold text-white">
          <Target className="text-rose-400" size={20} />
          <h3>Top Attack Vectors</h3>
        </div>
        <div className="space-y-4">
          {Object.entries(threatsByType)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([type, count]) => (
              <div
                key={type}
                className="group flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 group-hover:scale-150 transition-transform" />
                  <span className="text-sm text-blue-100/80 capitalize">
                    {type.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold text-white">{count}</span>
                  <span className="text-[10px] text-blue-200/40 font-mono">
                    events
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <div className="flex items-center gap-3 mb-6 font-semibold text-white">
          <Search className="text-amber-400" size={20} />
          <h3>Top Offending IPs</h3>
        </div>
        <div className="space-y-4">
          {topOffendingIps.map((offender, i) => (
            <div
              key={offender.ip}
              className="flex items-center justify-between"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <span className="text-blue-200/40 text-xs font-mono w-4">
                  {i + 1}.
                </span>
                <span className="text-sm text-blue-100/80 font-mono truncate">
                  {offender.ip}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold text-white">
                  {offender.count}
                </span>
                <button className="p-1.5 rounded-lg bg-white/5 text-blue-200/40 hover:bg-rose-500/20 hover:text-rose-400 transition-colors">
                  <ShieldCheck size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="md:col-span-2 rounded-3xl border border-white/10 bg-gradient-to-br from-blue-600/10 to-transparent p-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-3">
          <Zap className="text-blue-400" size={20} /> Technical Recommendations
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Recommendation
            title="IP Rate Limiting"
            desc="Enable strict rate limiting for the top offending IPs detected in the last 24h."
          />
          <Recommendation
            title="WAF Hardening"
            desc="Update WAF rules to pre-emptively block SQL injection patterns observed in recent logs."
          />
          <Recommendation
            title="Auth MFA"
            desc="Review brute force attempts. Consider forcing MFA for accounts with repeated failures."
          />
        </div>
      </div>
    </div>
  );
}

function Recommendation({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-bold text-blue-100">{title}</h4>
      <p className="text-xs text-blue-200/60 leading-relaxed">{desc}</p>
    </div>
  );
}
