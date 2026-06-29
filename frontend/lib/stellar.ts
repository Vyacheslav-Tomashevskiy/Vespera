import {
  isConnected,
  isAllowed,
  setAllowed,
  getAddress,
  signTransaction,
} from "@stellar/freighter-api";
import {
  Networks,
  TransactionBuilder,
  Account,
  BASE_FEE,
  Contract,
  Address,
  xdr,
  nativeToScVal,
  rpc,
} from "@stellar/stellar-sdk";

const NETWORK =
  (process.env.NEXT_PUBLIC_STELLAR_NETWORK as "TESTNET" | "PUBLIC") ?? "TESTNET";
const PASSPHRASE =
  NETWORK === "PUBLIC" ? Networks.PUBLIC : Networks.TESTNET;

/** Returns true when both env vars required for real rent-payment signing are present. */
function rentPaymentEnvConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_HORIZON_URL && process.env.NEXT_PUBLIC_RENTAL_CONTRACT_ID);
}

export function isRentPaymentConfigured(): boolean {
  return rentPaymentEnvConfigured();
}

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
 * Builds and signs a real Soroban rent-payment transaction.
 *
 * Requires NEXT_PUBLIC_HORIZON_URL and NEXT_PUBLIC_RENTAL_CONTRACT_ID to be
 * set in the environment. If either is missing the function throws immediately
 * so the caller never sees a fake success for a no-op transaction.
 *
 * @throws when env vars are missing, Freighter is unavailable, or the
 *         Horizon/Soroban network request fails.
 */
export async function signRentPayment(input: {
  propertyId: string;
  amount: number;
}): Promise<string> {
  const horizonUrl = process.env.NEXT_PUBLIC_HORIZON_URL ?? "";
  const contractId = process.env.NEXT_PUBLIC_RENTAL_CONTRACT_ID ?? "";

  if (!(horizonUrl && contractId)) {
    throw new Error(
      [
        "Rent payment signing is not configured.",
        "Set NEXT_PUBLIC_HORIZON_URL and NEXT_PUBLIC_RENTAL_CONTRACT_ID",
        "in your .env.local file.",
      ].join(" "),
    );
  }

  const userAddress = await connectFreighter();

  // Load the real account from the network so the transaction has a valid
  // sequence number and can actually be submitted.
  const server = new rpc.Server(horizonUrl);
  const networkAccount = await server.getAccount(userAddress);

  // Build the Soroban contract invocation for pay_rent.
  const contract = new Contract(contractId);
  const operation = contract.call(
    "pay_rent",
    new Address(userAddress).toScVal(),
    xdr.ScVal.scvString(input.propertyId),
    nativeToScVal(BigInt(Math.round(input.amount)), { type: "i128" }),
  );

  const tx = new TransactionBuilder(networkAccount, {
    fee: BASE_FEE,
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(60)
    .build();

  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: PASSPHRASE,
    address: userAddress,
  });

  return signed?.signedTxXdr ?? "";
}
