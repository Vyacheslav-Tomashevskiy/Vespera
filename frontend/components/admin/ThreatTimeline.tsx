'use client';

import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ThreatStats } from '@/types/security';

interface ThreatTimelineProps {
  stats: ThreatStats | null;
  loading: boolean;
}

export function ThreatTimeline({ stats, loading }: ThreatTimelineProps) {
  if (loading || !stats) {
    return (
      <div className="h-[300px] w-full animate-pulse rounded-3xl border border-white/10 bg-white/5" />
    );
  }

  const data = stats.threatsOverTime.map((point) => ({
    ...point,
    displayDate: new Date(point.date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    }),
  }));

  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 h-[400px]">
      <h3 className="mb-6 text-lg font-semibold text-white">
        Threat Activity Timeline
      </h3>
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255,255,255,0.05)"
              vertical={false}
            />
            <XAxis
              dataKey="displayDate"
              stroke="rgba(255,255,255,0.4)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="rgba(255,255,255,0.4)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                color: '#fff',
              }}
              itemStyle={{ color: '#ef4444' }}
              labelStyle={{
                color: 'rgba(255, 255, 255, 0.6)',
                marginBottom: '4px',
              }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCount)"
              name="Threats Detect"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
