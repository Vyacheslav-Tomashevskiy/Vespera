"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchPayments, type Payment } from "@/lib/mock";
import { formatUSDC } from "@/lib/format";

export default function PaymentsPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Payments</h1>
        <p className="mt-2 text-ink-muted">Loading payment history…</p>
        <div className="mt-8 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-ink/10 p-4 animate-pulse">
              <div className="h-5 w-32 rounded bg-ink/10" />
              <div className="mt-2 h-4 w-24 rounded bg-ink/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Payments</h1>
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-800">Failed to load payments</p>
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

  if (!data || data.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Payments</h1>
        <p className="mt-8 text-ink-muted">No payment history available.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-12">
      <h1 className="text-3xl font-semibold">Payments</h1>
      <p className="mt-2 text-ink-muted">
        Receipts for every rent payment, anchored to a Soroban transaction.
      </p>

      <ul className="mt-8 divide-y divide-ink/10 rounded-2xl border border-ink/10">
        {data.map((p: Payment) => (
          <li key={p.id} className="grid grid-cols-4 items-center gap-4 p-4">
            <div className="font-medium">{p.property}</div>
            <div className="text-sm text-ink-muted">{p.date}</div>
            <div className="font-mono text-sm text-ink-muted truncate">
              {p.txHash}
            </div>
            <div className="text-right font-mono font-semibold">
              {formatUSDC(p.amount)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
