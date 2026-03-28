'use client';

import React from 'react';
import {
  AlertCircle,
  ChevronRight,
  Shield,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
} from 'lucide-react';
import {
  ThreatEvent,
  ThreatLevel,
  ThreatStatus,
  ThreatType,
} from '@/types/security';

interface ThreatListProps {
  threats: ThreatEvent[];
  loading: boolean;
  onSelect: (threat: ThreatEvent) => void;
  filters: {
    type: string;
    level: string;
    status: string;
  };
  setFilters: (filters: {
    type: string;
    level: string;
    status: string;
    search: string;
  }) => void;
}

export function ThreatList({
  threats,
  loading,
  onSelect,
  filters,
  setFilters,
}: ThreatListProps) {
  const getLevelColor = (level: ThreatLevel) => {
    switch (level) {
      case ThreatLevel.CRITICAL:
        return 'text-rose-500 bg-rose-500/10';
      case ThreatLevel.HIGH:
        return 'text-orange-500 bg-orange-500/10';
      case ThreatLevel.MEDIUM:
        return 'text-amber-500 bg-amber-500/10';
      case ThreatLevel.LOW:
        return 'text-emerald-500 bg-emerald-500/10';
      default:
        return 'text-blue-500 bg-blue-500/10';
    }
  };

  const getStatusIcon = (status: ThreatStatus) => {
    switch (status) {
      case ThreatStatus.MITIGATED:
        return <ShieldCheck className="text-emerald-500" size={16} />;
      case ThreatStatus.DETECTED:
        return <AlertCircle className="text-rose-500" size={16} />;
      case ThreatStatus.INVESTIGATING:
        return <Activity className="text-amber-500" size={16} />;
      case ThreatStatus.CONFIRMED:
        return <ShieldAlert className="text-orange-500" size={16} />;
      case ThreatStatus.FALSE_POSITIVE:
        return <ShieldX className="text-slate-500" size={16} />;
      default:
        return <Shield className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.type}
          onChange={(e) => setFilters({ ...filters, type: e.target.value, search: '' })}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="">All Types</option>
          {Object.values(ThreatType).map((type) => (
            <option key={type} value={type} className="bg-slate-900">
              {type.replace(/_/g, ' ')}
            </option>
          ))}
        </select>

        <select
          value={filters.level}
          onChange={(e) => setFilters({ ...filters, level: e.target.value, search: '' })}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="">All Severities</option>
          {Object.values(ThreatLevel).map((level) => (
            <option key={level} value={level} className="bg-slate-900">
              {level}
            </option>
          ))}
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, search: '' })}
          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-blue-500"
        >
          <option value="">All Statuses</option>
          {Object.values(ThreatStatus).map((status) => (
            <option key={status} value={status} className="bg-slate-900">
              {status}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 mt-4">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/10 text-xs uppercase tracking-wider text-blue-200/50">
              <th className="px-6 py-4 font-medium">Timestamp</th>
              <th className="px-6 py-4 font-medium">Type</th>
              <th className="px-6 py-4 font-medium">Source IP</th>
              <th className="px-6 py-4 font-medium">Severity</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  {[...Array(6)].map((_, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className="h-4 w-24 rounded bg-white/10" />
                    </td>
                  ))}
                </tr>
              ))
            ) : threats.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-12 text-center text-blue-200/40"
                >
                  No threats detected matching these filters.
                </td>
              </tr>
            ) : (
              threats.map((threat) => (
                <tr
                  key={threat.id}
                  className="group cursor-pointer hover:bg-white/[0.02] transition-colors"
                  onClick={() => onSelect(threat)}
                >
                  <td className="px-6 py-4 text-sm text-blue-100/80">
                    {new Date(threat.createdAt).toLocaleString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-white capitalize">
                      {threat.threatType.replace(/_/g, ' ')}
                    </span>
                    <p className="max-w-[150px] truncate text-xs text-blue-200/40">
                      {threat.description}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-blue-200/60">
                    {threat.ipAddress || 'unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase ${getLevelColor(threat.threatLevel)}`}
                    >
                      {threat.threatLevel}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-sm text-blue-100/80 capitalize">
                      {getStatusIcon(threat.status)}
                      {threat.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-blue-200/40 group-hover:text-white transition-colors">
                      <ChevronRight size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Activity(props: Record<string, unknown>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
