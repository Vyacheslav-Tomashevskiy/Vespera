import { getHorizonServerUrl } from '@/lib/stellar-network';

export interface StellarBalanceRow {
  /** Display label, e.g. `XLM` or `USDC:GA...` */
  label: string;
  /** Raw balance string from Horizon */
  amount: string;
  assetType: string;
}

interface HorizonBalance {
  balance: string;
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
}

function labelFromBalance(b: HorizonBalance): string {
  if (b.asset_type === 'native') return 'XLM';
  if (b.asset_code && b.asset_issuer) {
    return `${b.asset_code}:${b.asset_issuer.slice(0, 4)}…${b.asset_issuer.slice(-4)}`;
  }
  return b.asset_code ?? b.asset_type;
}

export function parseHorizonBalances(
  balances: HorizonBalance[],
): StellarBalanceRow[] {
  return (balances ?? []).map((b) => ({
    label: labelFromBalance(b),
    amount: b.balance,
    assetType: b.asset_type,
  }));
}

export async function fetchAccountBalances(
  publicKey: string,
): Promise<StellarBalanceRow[]> {
  const base = getHorizonServerUrl();
  const res = await fetch(`${base}/accounts/${encodeURIComponent(publicKey)}`, {
    cache: 'no-store',
  });

  if (res.status === 404) {
    throw new Error(
      'Account not funded on this network. Send test XLM from a faucet first.',
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Horizon error (${res.status})`);
  }

  const json = (await res.json()) as { balances?: HorizonBalance[] };
  return parseHorizonBalances(json.balances ?? []);
}
