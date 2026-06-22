"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { fetchProperties, type Property } from "@/lib/mock";
import { formatUSDC } from "@/lib/format";

export default function PropertiesPage() {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["properties"],
    queryFn: fetchProperties,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Properties</h1>
        <p className="mt-2 text-ink-muted">Loading listings…</p>
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-ink/10 p-5 animate-pulse">
              <div className="aspect-[4/3] rounded-xl bg-ink/5" />
              <div className="mt-4 h-5 w-32 rounded bg-ink/10" />
              <div className="mt-2 h-4 w-24 rounded bg-ink/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Properties</h1>
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6">
          <p className="font-medium text-red-800">Failed to load properties</p>
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
      <div className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-3xl font-semibold">Properties</h1>
        <p className="mt-8 text-ink-muted">No properties available at the moment.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Properties</h1>
          <p className="mt-2 text-ink-muted">
            Listings open for rent. Click a card to view lease terms.
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {data.map((p: Property) => (
          <Link
            key={p.id}
            href={`/properties/${p.id}`}
            className="rounded-2xl border border-ink/10 p-5 transition hover:border-brand"
          >
            <div
              className="aspect-[4/3] rounded-xl bg-brand-50"
              role="img"
              aria-label={`${p.title} property photo`}
            />
            <div className="mt-4 flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{p.title}</div>
                <div className="text-sm text-ink-muted">{p.location}</div>
              </div>
              <div className="text-right">
                <div className="font-mono font-semibold">
                  {formatUSDC(p.rentPerMonth)}
                </div>
                <div className="text-xs text-ink-muted">/ month</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
