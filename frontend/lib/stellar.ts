import {
  isConnected,
  isAllowed,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import { Networks, TransactionBuilder, Account, BASE_FEE } from "@stellar/stellar-sdk";

const NETWORK =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as "TESTNET" | "PUBLIC") ?? "TESTNET";
const PASSPHRASE =
  NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;

export async function getFreighterAddress(): Promise<string | null> {
  const conn = await isConnected();
  if (!conn?.isConnected) return null;
  const allowed = await isAllowed();
  if (!allowed?.isAllowed) return null;
  const res = await getAddress();
  return res?.address ?? null;
}

export async function connectFreighter(): Promise<string> {
  const allowed = await isAllowed();
  if (!allowed?.isAllowed) {
    const grant = await setAllowed();
    if (!grant?.isAllowed) throw new Error("freighter not allowed");
  }
  const res = await getAddress();
  if (!res?.address) throw new Error("no address");
  return res.address;
}

/**
 * Forget the locally-connected Freighter session.
 *
 * Freighter exposes no dapp-initiated revoke — an app can request access with
 * `setAllowed` but cannot programmatically un-allow itself — so "disconnect"
 * here means the app drops its own view of the connected address. Keeping it in
 * this module means the wallet UI never has to know that distinction, and gives
 * a single seam for a real revoke to slot into if the extension ever grows one.
 *
 * Persisting/clearing wallet sessions in storage is intentionally out of scope
 * (see issue #10), so there is nothing else to tear down here.
 */
export async function disconnectFreighter(): Promise<void> {
  // No persisted session to clear.
}

export async function signRentPayment(_input: {
  propertyId: string;
  amount: number;
}): Promise<string> {
  const address = await connectFreighter();

  const placeholderAccount = new Account(address, "0");
  const tx = new TransactionBuilder(placeholderAccount, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .setTimeout(60)
    .build();

  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: PASSPHRASE,
    address,
  });
  return signed?.signedTxXdr ?? "";
}
