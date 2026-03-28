'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Shield, RefreshCcw, Download, Search } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { ThreatEvent, ThreatStats as IThreatStats } from '@/types/security';
import { ThreatStats } from './ThreatStats';
import { ThreatTimeline } from './ThreatTimeline';
import { ThreatList } from './ThreatList';
import { ThreatDetailModal } from './ThreatDetailModal';
import { ThreatAnalysis } from './ThreatAnalysis';

export function ThreatDashboard() {
  const [threats, setThreats] = useState<ThreatEvent[]>([]);
  const [stats, setStats] = useState<IThreatStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedThreat, setSelectedThreat] = useState<ThreatEvent | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<'overview' | 'list' | 'analysis'>(
    'overview',
  );
  const [filters, setFilters] = useState({
    type: '',
    level: '',
    status: '',
    search: '',
  });

  const fetchThreatData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const [threatsRes, statsRes] = await Promise.all([
        apiClient.get<ThreatEvent[]>('/api/v1/security/threats?limit=100'),
        apiClient.get<IThreatStats>('/api/v1/security/threats/stats?hours=24'),
      ]);

      setThreats(threatsRes.data || []);
      setStats(statsRes.data || null);
    } catch (error) {
      console.error('Failed to fetch threat data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchThreatData();
    const interval = setInterval(() => fetchThreatData(true), 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchThreatData]);

  const filteredThreats = useMemo(() => {
    return threats.filter((t) => {
      if (filters.type && t.threatType !== filters.type) return false;
      if (filters.level && t.threatLevel !== filters.level) return false;
      if (filters.status && t.status !== filters.status) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          t.ipAddress?.toLowerCase().includes(search) ||
          t.description?.toLowerCase().includes(search) ||
          t.threatType.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [threats, filters]);

  const handleExport = () => {
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [
        'ID,Type,Level,Status,IP,Path,Time',
        ...threats.map(
          (t) =>
            `${t.id},${t.threatType},${t.threatLevel},${t.status},${t.ipAddress},${t.requestPath},${t.createdAt}`,
        ),
      ].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `threats_export_${new Date().toISOString()}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen space-y-8 pb-20">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600/20 text-blue-400">
              <Shield size={24} />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Threat Monitoring
            </h1>
          </div>
          <p className="text-blue-200/50">
            Real-time security analytics and incident tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchThreatData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-blue-100 hover:bg-white/10 transition-all disabled:opacity-50"
          >
            <RefreshCcw
              size={16}
              className={refreshing ? 'animate-spin' : ''}
            />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/20"
          >
            <Download size={16} />
            Export Data
          </button>
        </div>
      </header>

      <div className="flex border-b border-white/10">
        <TabButton
          active={activeTab === 'overview'}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </TabButton>
        <TabButton
          active={activeTab === 'list'}
          onClick={() => setActiveTab('list')}
        >
          Threat List
        </TabButton>
        <TabButton
          active={activeTab === 'analysis'}
          onClick={() => setActiveTab('analysis')}
        >
          Deep Analysis
        </TabButton>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <ThreatStats stats={stats} loading={loading} />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <ThreatTimeline stats={stats} loading={loading} />
            </div>
            <div className="space-y-4 rounded-3xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-lg font-semibold text-white">
                Recent Alerts
              </h3>
              <div className="space-y-4">
                {threats.slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    className="flex items-start gap-4 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => setSelectedThreat(t)}
                  >
                    <div
                      className={`mt-1 h-2 w-2 shrink-0 rounded-full ${t.threatLevel === 'critical' ? 'bg-rose-500' : 'bg-orange-500'}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate capitalize">
                        {t.threatType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-blue-200/40 truncate">
                        {t.ipAddress}
                      </p>
                    </div>
                    <span className="text-[10px] text-blue-200/30 whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setActiveTab('list')}
                className="w-full rounded-xl border border-blue-400/20 py-2 text-xs font-semibold text-blue-400 hover:bg-blue-400/10 transition-colors"
              >
                View All Threats
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'list' && (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
          <div className="relative max-w-md">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-200/40"
              size={18}
            />
            <input
              type="text"
              placeholder="Search by IP, path, or description..."
              value={filters.search}
              onChange={(e) =>
                setFilters({ ...filters, search: e.target.value })
              }
              className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-sm text-white outline-none focus:border-blue-500 transition-all font-medium placeholder:text-blue-200/20"
            />
          </div>
          <ThreatList
            threats={filteredThreats}
            loading={loading}
            onSelect={setSelectedThreat}
            filters={filters}
            setFilters={setFilters}
          />
        </div>
      )}

      {activeTab === 'analysis' && (
        <div className="animate-in zoom-in-95 duration-500">
          <ThreatAnalysis stats={stats} loading={loading} />
        </div>
      )}

      <ThreatDetailModal
        threat={selectedThreat}
        onClose={() => setSelectedThreat(null)}
      />
    </div>
  );
}

function TabButton({
  children,
  active,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-6 py-4 text-sm font-semibold transition-all ${
        active ? 'text-blue-400' : 'text-blue-200/40 hover:text-blue-200/70'
      }`}
    >
      {children}
      {active && (
        <div className="absolute bottom-0 left-0 h-0.5 w-full bg-blue-400 shadow-[0_-4px_12px_rgba(96,165,250,0.4)]" />
      )}
    </button>
  );
}
