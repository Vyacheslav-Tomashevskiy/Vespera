'use client';

import Link from 'next/link';
import { RefreshCcw, WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 px-6 py-16 text-white">
      <div className="w-full max-w-xl rounded-3xl border border-white/10 bg-slate-950/80 p-8 shadow-2xl backdrop-blur">
        <div className="inline-flex rounded-2xl bg-blue-500/10 p-4 text-blue-300">
          <WifiOff className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight">
          You&rsquo;re offline
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Chioma cached this screen so you can still open the app shell.
          Reconnect to refresh listings, leases, messages, and payments.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-500"
            onClick={() => window.location.reload()}
            type="button"
          >
            <RefreshCcw className="h-4 w-4" />
            Try again
          </button>
          <Link
            className="rounded-xl border border-white/15 px-4 py-2 text-sm text-slate-200 transition hover:border-white/30 hover:bg-white/5"
            href="/"
          >
            Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
