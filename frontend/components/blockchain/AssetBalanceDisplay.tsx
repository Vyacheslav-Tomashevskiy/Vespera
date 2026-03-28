'use client';

import React from 'react';
import type { StellarBalanceRow } from '@/lib/stellar-horizon';
import { Coins, Loader2 } from 'lucide-react';

export interface AssetBalanceDisplayProps {
  balances: StellarBalanceRow[];
  loading?: boolean;
  error?: string | null;
  emptyLabel?: string;
  className?: string;
}

export function AssetBalanceDisplay({
  balances,
  loading,
  error,
  emptyLabel = 'No balances',
  className = '',
}: AssetBalanceDisplayProps) {
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-10 text-slate-400 ${className}`}
      >
        <Loader2 className="animate-spin" size={22} />
        <span className="text-sm">Loading balances…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={`rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300 ${className}`}
        role="alert"
      >
        {error}
      </div>
    );
  }

  if (balances.length === 0) {
    return (
      <div
        className={`rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-slate-500 ${className}`}
      >
        {emptyLabel}
      </div>
    );
  }

  return (
    <ul
      className={`divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 overflow-hidden ${className}`}
    >
      {balances.map((b, i) => (
        <li
          key={`${b.label}-${i}`}
          className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
        >
          <span className="flex items-center gap-2 text-slate-300 min-w-0">
            <Coins size={16} className="text-amber-400 shrink-0" />
            <span className="font-mono truncate" title={b.label}>
              {b.label}
            </span>
          </span>
          <span className="text-white font-medium tabular-nums shrink-0">
            {b.amount}
          </span>
        </li>
      ))}
    </ul>
  );
}
