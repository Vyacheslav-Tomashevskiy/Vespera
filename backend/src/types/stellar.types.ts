// backend/src/types/stellar.types.ts

import {
  StellarPublicKey,
  StellarSecretKey,
  TransactionHash,
  ISO8601DateTime,
} from './common.types';

export type StellarNetwork = 'testnet' | 'pubnet';

export interface StellarConfig {
  network: StellarNetwork;
  horizonUrl: string;
  networkPassphrase: string;
  friendbotUrl?: string;
}

export interface AccountKeys {
  publicKey: StellarPublicKey;
  secretKey: StellarSecretKey; // Should be encrypted before storage
}

export interface StellarAccountBalance {
  assetType: string;
  assetCode?: string;
  assetIssuer?: string;
  balance: string;
  limit?: string;
  buyingLiabilities: string;
  sellingLiabilities: string;
}

export interface StellarAccountDetails {
  id: StellarPublicKey;
  accountId: StellarPublicKey;
  sequence: string;
  subentryCount: number;
  balances: StellarAccountBalance[];
  signers: AccountSigner[];
  flags: {
    authRequired: boolean;
    authRevocable: boolean;
    authImmutable: boolean;
    authClawbackEnabled: boolean;
  };
  thresholds: {
    lowThreshold: number;
    medThreshold: number;
    highThreshold: number;
  };
}

export interface AccountSigner {
  key: string;
  weight: number;
  type: 'ed25519_public_key' | 'sha256_hash' | 'preauth_tx';
}

export interface StellarAssetInfo {
  code: string;
  issuer: StellarPublicKey;
  type: 'native' | 'credit_alphanum4' | 'credit_alphanum12';
}

export interface TransactionSubmitResult {
  hash: TransactionHash;
  ledger: number;
  successful: boolean;
  envelope_xdr: string;
  result_xdr: string;
  result_meta_xdr: string;
}

export interface EscrowAccount {
  publicKey: StellarPublicKey;
  signers: {
    tenant: StellarPublicKey;
    landlord: StellarPublicKey;
  };
  thresholds: {
    low: number;
    medium: number;
    high: number;
  };
  balance: string;
  asset: StellarAssetInfo;
}

export interface PaymentOperation {
  type: 'payment';
  from: StellarPublicKey;
  to: StellarPublicKey;
  amount: string;
  asset: StellarAssetInfo;
}

export interface PreAuthorizedTransaction {
  transactionHash: TransactionHash;
  transaction: any; // Using 'any' since we don't have direct access to StellarTransaction type here
  expiresAt: ISO8601DateTime;
  status: 'pending' | 'executed' | 'revoked' | 'expired';
}

export interface AssetFlags {
  authRequired?: boolean;
  authRevocable?: boolean;
  authImmutable?: boolean;
  authClawbackEnabled?: boolean;
}
