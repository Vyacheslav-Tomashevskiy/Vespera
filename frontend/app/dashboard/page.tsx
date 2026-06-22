"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDashboardData } from "@/lib/mock";
import { formatUSDC } from "@/lib/format";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-2 text-ink-muted">Loading your overview…</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-ink/10 p-5 animate-pulse">
              <div className="h-4 w-24 rounded bg-ink/10" />
              <div className="mt-3 h-8 w-16 rounded bg-ink/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-800">Failed to load dashboard data</p>
          <p className="mt-1 text-sm text-red-600">{(error as Error)?.message || "Unknown error"}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Dashboard</h1>
        <p className="mt-8 text-ink-muted">No dashboard data available.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-ink-muted">
        Your active leases, recent rent payments, and escrowed deposits.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Active leases" value={data.activeLeases.toString()} />
        <Stat label="Rent due this month" value={formatUSDC(data.dueThisMonth)} />
        <Stat label="Escrowed deposits" value={formatUSDC(data.escrowed)} />
      </div>

      <section className="mt-12">
        <h2 className="text-xl font-semibold">Recent payments</h2>
        {data.recent.length === 0 ? (
          <p className="mt-4 text-ink-muted">No recent payments.</p>
        ) : (
          <ul className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/10">
            {data.recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-4">
                <div>
                  <div className="font-medium">{p.property}</div>
                  <div className="text-sm text-ink-muted">{p.date}</div>
                </div>
                <div className="font-mono">{formatUSDC(p.amount)}</div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 p-5">
      <div className="text-sm text-ink-muted">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}
