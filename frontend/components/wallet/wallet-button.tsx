
"use client";

import { useEffect, useState } from "react";
import { Wallet } from "lucide-react";
import { connectFreighter, getFreighterAddress } from "@/lib/stellar";

/**
 * FIX #10: Eliminates hydration mismatch by gating address-dependent rendering
 * behind a  flag. The server always renders the Connect button;
 * the client renders the correct state after first paint.
 *
 * Connected state is now a proper <button> with aria-label for accessibility.
 */
export function WalletButton() {
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Prevents server/client mismatch: server never knows wallet state
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    getFreighterAddress().then(setAddress).catch(() => setAddress(null));
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
    setAddress(null);
  }

  // Before mount, render Connect so server and client initial HTML match
  if (!mounted) {
    return (
      <button
        disabled
        aria-label="Connect wallet"
        className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm text-white opacity-50"
      >
        <Wallet className="h-4 w-4" />
        Connect
      </button>
    );
  }

  if (address) {
    const short = ;
    return (
      <button
        onClick={handleDisconnect}
        aria-label={}
        title="Click to disconnect"
        className="rounded-full border border-ink/10 px-4 py-2 font-mono text-xs hover:border-destructive hover:text-destructive transition-colors"
      >
        {short}
      </button>
    );
  }

  return (
    <button
      onClick={handleConnect}
      disabled={busy}
      aria-label="Connect Freighter wallet"
      className="inline-flex items-center gap-2 rounded-full bg-brand px-4 py-2 text-sm text-white hover:bg-brand-600 disabled:opacity-50"
    >
      <Wallet className="h-4 w-4" />
      {busy ? "Connecting…" : "Connect"}
    </button>
  );
}
