import Link from 'next/link';
import { WifiOff } from 'lucide-react';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-950 flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-xl p-8 text-center">
        <div className="mx-auto mb-4 w-14 h-14 rounded-2xl border border-amber-400/30 bg-amber-500/20 flex items-center justify-center text-amber-300">
          <WifiOff size={28} />
        </div>
        <h1 className="text-2xl font-bold text-white">You are offline</h1>
        <p className="text-sm text-blue-200/70 mt-2">
          Chioma cannot load fresh data right now. Reconnect to continue with
          transactions and live updates.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-blue-500/30 hover:bg-blue-500/40 border border-blue-400/30 text-blue-100 text-sm font-semibold"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white text-sm"
          >
            Go home
          </Link>
        </div>
      </section>
    </main>
  );
}
