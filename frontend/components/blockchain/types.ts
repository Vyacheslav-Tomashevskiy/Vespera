/** On-chain row for generic history UIs (not the same as landlord Transaction type). */
export interface BlockchainTxRow {
  id: string;
  /** Stellar transaction hash */
  hash: string;
  amount: string;
  /** e.g. XLM, USDC */
  asset: string;
  createdAt: string;
  direction: 'in' | 'out';
  memo?: string;
}
