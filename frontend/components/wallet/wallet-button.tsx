"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import {
  connectFreighter,
  disconnectFreighter,
  getFreighterAddress,
} from "@/lib/stellar";

function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function WalletButton() {
  // `mounted` stays false on the server and during the very first client
  // render, so the markup React hydrates is always the deterministic
  // disconnected button. Wallet state is only read afterwards, which removes
  // both the hydration mismatch and the connect→address flash the previous
  // render-then-flip behaviour produced.
  const [mounted, setMounted] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
    getFreighterAddress()
      .then(setAddress)
      .catch(() => setAddress(null));
  }, []);

  async function handleConnect() {
    setBusy(true);
    try {
      const addr = await connectFreighter();
      setAddress(addr);
    } finally {
      setBusy(false);
    }
  }

  async function handleDisconnect() {
    setBusy(true);
    try {
      await disconnectFreighter();
      setAddress(null);
    } finally {
      setBusy(false);
    }
  }

  // Connected: a real, labelled control instead of a bare <div>. Assistive
  // tech announces the wallet address, and activating it disconnects, so the
  // pill is no longer a clickable-looking element with no behaviour.
  if (mounted && address) {
    return (
      <button
        type="button"
        onClick={handleDisconnect}
        disabled={busy}
        title={address}
        aria-label={`Wallet ${address}. Activate to sign out.`}
        className="inline-flex items-center gap-2 rounded-full border border-ink/10 px-4 py-2 font-mono text-xs hover:bg-ink/5 disabled:opacity-50"
      >
        <span
          aria-hidden="true"
          className="inline-block h-2 w-2 rounded-full bg-emerald-500"
        />
        {truncateAddress(address)}
      </button>
    );
  }

  // Disconnected — and the deterministic pre-mount/hydration pass. The button
  // is inert until mounted so a click can never race the initial wallet read.
  return (
    <button
      type="button"
      onClick={handleConnect}
      disabled={!mounted || busy}
      aria-label="Connect wallet"
      className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
    >
      <Wallet className="h-4 w-4" aria-hidden="true" />
      {busy ? "Connecting…" : "Connect"}
    </button>
  );
}
