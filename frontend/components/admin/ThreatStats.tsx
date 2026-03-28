'use client';

import React from 'react';
import { Shield, ShieldAlert, ShieldCheck, Activity } from 'lucide-react';
import { ThreatStats as IThreatStats, ThreatLevel } from '@/types/security';

interface ThreatStatsProps {
  stats: IThreatStats | null;
  loading: boolean;
}

export function ThreatStats({ stats, loading }: ThreatStatsProps) {
  if (loading || !stats) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-3xl border border-white/10 bg-white/5 p-6 h-32"
          />
        ))}
      </div>
    );
  }

  const { totalThreats, mitigationRate, threatsByLevel } = stats;

  const metrics = [
    {
      title: 'Total Threats (24h)',
      value: totalThreats,
      icon: <Activity className="text-blue-400" size={24} />,
      label: 'Detection volume',
    },
    {
      title: 'Mitigation Rate',
      value: `${(mitigationRate * 100).toFixed(1)}%`,
      icon: <ShieldCheck className="text-emerald-400" size={24} />,
      label: 'Automatic response',
    },
    {
      title: 'High/Critical',
      value:
        (threatsByLevel[ThreatLevel.HIGH] || 0) +
        (threatsByLevel[ThreatLevel.CRITICAL] || 0),
      icon: <ShieldAlert className="text-rose-400" size={24} />,
      label: 'Requires attention',
    },
    {
      title: 'System Health',
      value: totalThreats > 100 ? 'Warning' : 'Healthy',
      icon: <Shield className="text-amber-400" size={24} />,
      label: 'Security posture',
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 transition-all hover:border-white/20"
        >
          <div className="flex items-center justify-between">
            <span className="text-blue-200/60 text-sm font-medium">
              {metric.title}
            </span>
            {metric.icon}
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <h3 className="text-3xl font-bold text-white">{metric.value}</h3>
          </div>
          <p className="mt-1 text-xs text-blue-200/40">{metric.label}</p>
        </div>
      ))}
    </div>
  );
}
