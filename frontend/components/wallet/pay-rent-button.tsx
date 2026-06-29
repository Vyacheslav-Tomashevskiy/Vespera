"use client";

import { useState } from "react";
import { signRentPayment, isRentPaymentConfigured } from "@/lib/stellar";

export function PayRentButton({
  propertyId,
  amount,
}: {
  propertyId: string;
  amount: number;
}) {
  const [status, setStatus] = useState<"idle" | "signing" | "ok" | "error">(
    "idle",
  );
  const [tx, setTx] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handlePay() {
    setStatus("signing");
    setErrorMsg(null);
    try {
      const xdr = await signRentPayment({ propertyId, amount });
      if (!xdr) {
        throw new Error("Freighter returned an empty signed transaction");
      }
      setTx(xdr);
      setStatus("ok");
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Signing failed. Check Freighter.";
      setErrorMsg(msg);
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!isRentPaymentConfigured() && (
        <p className="text-sm text-amber-600">
          Rent payment not configured. Set NEXT_PUBLIC_HORIZON_URL and
          NEXT_PUBLIC_RENTAL_CONTRACT_ID in your environment.
        </p>
      )}
      <button
        onClick={handlePay}
        disabled={status === "signing"}
        className="inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-white hover:bg-brand-600 disabled:opacity-50"
      >
        {status === "signing" ? "Signing\u2026" : "Pay rent"}
      </button>
      {status === "ok" && tx && (
        <p className="text-sm text-ink-muted">
          Signed. Tx envelope:{" "}
          <span className="font-mono">{tx.slice(0, 24)}\u2026</span>
        </p>
      )}
      {status === "error" && (
        <p className="text-sm text-red-600">
          {errorMsg ?? "Signing failed. Check Freighter."}
        </p>
      )}
    </div>
  );
}
