import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository, DataSource } from 'typeorm';
import * as StellarSdk from '@stellar/stellar-sdk';
import { Contract, SorobanRpc, xdr } from '@stellar/stellar-sdk';
import { StellarPayment } from '../entities/stellar-payment.entity';
import { isTransientStellarError } from './stellar-transaction-resilience';

/**
 * Thrown when a submitted transaction could not be confirmed within the
 * polling deadline. It is NOT a definitive failure — the transaction may
 * still settle on-chain — so it carries the submitted `hash` to let the
 * caller persist it for later reconciliation instead of losing it.
 */
export class TransactionPollTimeoutError extends Error {
  readonly hash: string;

  constructor(hash: string) {
    super(
      `Transaction not confirmed before polling deadline: ${hash} ` +
        '(submission may still settle on-chain; persisted for reconciliation)',
    );
    this.name = 'TransactionPollTimeoutError';
    this.hash = hash;
  }
}

@Injectable()
export class PaymentProcessingService {
  private readonly logger = new Logger(PaymentProcessingService.name);
  private readonly server: SorobanRpc.Server;
  private readonly contract?: Contract;
  private readonly networkPassphrase: string;
  private readonly adminKeypair?: StellarSdk.Keypair;
  private readonly isConfigured: boolean;

  // Polling / submission resilience knobs (env-configurable).
  private readonly pollMaxAttempts: number;
  private readonly pollBaseDelayMs: number;
  private readonly pollMaxDelayMs: number;
  private readonly pollDeadlineMs: number;
  private readonly sendMaxRetries: number;

  private readonly paymentRepository: Repository<StellarPayment>;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {
    this.paymentRepository = this.dataSource.getRepository(StellarPayment);

    this.pollMaxAttempts = this.getEnvInt('STELLAR_POLL_MAX_ATTEMPTS', 10, 1);
    this.pollBaseDelayMs = this.getEnvInt(
      'STELLAR_POLL_BASE_DELAY_MS',
      1000,
      1,
    );
    this.pollMaxDelayMs = this.getEnvInt('STELLAR_POLL_MAX_DELAY_MS', 8000, 1);
    this.pollDeadlineMs = this.getEnvInt('STELLAR_POLL_DEADLINE_MS', 30000, 1);
    this.sendMaxRetries = this.getEnvInt('STELLAR_SEND_MAX_RETRIES', 3, 0);

    const rpcUrl =
      this.configService.get<string>('SOROBAN_RPC_URL') ||
      'https://soroban-testnet.stellar.org';
    const contractId =
      this.configService.get<string>('PAYMENT_PROCESSING_CONTRACT_ID') || '';
    const adminSecret =
      this.configService.get<string>('STELLAR_ADMIN_SECRET_KEY') || '';
    const network = this.configService.get<string>(
      'STELLAR_NETWORK',
      'testnet',
    );

    this.server = new SorobanRpc.Server(rpcUrl);

    if (contractId) {
      this.contract = new Contract(contractId);
      this.isConfigured = true;
    } else {
      this.logger.warn(
        'PAYMENT_PROCESSING_CONTRACT_ID not set - payment processing features will be disabled',
      );
      this.isConfigured = false;
    }

    this.networkPassphrase =
      network === 'mainnet'
        ? StellarSdk.Networks.PUBLIC
        : StellarSdk.Networks.TESTNET;

    if (adminSecret) {
      this.adminKeypair = StellarSdk.Keypair.fromSecret(adminSecret);
    }
  }

  async processRentPayment(
    from: string,
    agreementId: string,
    amount: string,
    callerKeypair: StellarSdk.Keypair,
  ): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }

      const account = await this.server.getAccount(from);

      const operation = this.contract.call(
        'pay_rent',
        new StellarSdk.Address(from).toScVal(),
        xdr.ScVal.scvString(agreementId),
        StellarSdk.nativeToScVal(BigInt(amount), { type: 'i128' }),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(callerKeypair);

      const result = await this.sendTransactionWithRetry(prepared);
      const hash = await this.pollTransactionStatus(result.hash);

      return hash;
    } catch (error) {
      this.logger.error(
        `Failed to process rent payment: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async setPlatformFeeCollector(collector: string): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        throw new Error('Contract not configured');
      }
      if (!this.adminKeypair) {
        throw new Error('Admin keypair not configured');
      }

      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'set_platform_fee_collector',
        new StellarSdk.Address(collector).toScVal(),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const prepared = await this.server.prepareTransaction(tx);
      prepared.sign(this.adminKeypair);

      const result = await this.sendTransactionWithRetry(prepared);
      return await this.pollTransactionStatus(result.hash);
    } catch (error) {
      this.logger.error(
        `Failed to set platform fee collector: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getPaymentCount(): Promise<number> {
    try {
      if (!this.isConfigured || !this.contract) {
        return 0;
      }
      if (!this.adminKeypair) {
        return 0;
      }

      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call('get_payment_count');

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        return StellarSdk.scValToNative(simulated.result.retval);
      }

      return 0;
    } catch (error) {
      this.logger.error(
        `Failed to get payment count: ${error.message}`,
        error.stack,
      );
      return 0;
    }
  }

  async getTotalPaid(agreementId: string): Promise<string> {
    try {
      if (!this.isConfigured || !this.contract) {
        return '0';
      }
      if (!this.adminKeypair) {
        return '0';
      }

      const account = await this.server.getAccount(
        this.adminKeypair.publicKey(),
      );

      const operation = this.contract.call(
        'get_total_paid',
        xdr.ScVal.scvString(agreementId),
      );

      const tx = new StellarSdk.TransactionBuilder(account, {
        fee: StellarSdk.BASE_FEE,
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      const simulated = await this.server.simulateTransaction(tx);

      if (SorobanRpc.Api.isSimulationSuccess(simulated) && simulated.result) {
        const val = StellarSdk.scValToNative(simulated.result.retval);
        return val ? val.toString() : '0';
      }

      return '0';
    } catch (error) {
      this.logger.error(
        `Failed to get total paid: ${error.message}`,
        error.stack,
      );
      return '0';
    }
  }

  private getEnvInt(key: string, fallback: number, min: number): number {
    const raw = this.configService.get<string | number>(key);
    if (raw === undefined || raw === null || raw === '') {
      return fallback;
    }
    const parsed = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
    if (!Number.isFinite(parsed) || parsed < min) {
      return fallback;
    }
    return Math.floor(parsed);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Exponential backoff with full jitter, capped at pollMaxDelayMs and never
   * overshooting the remaining time before the deadline.
   */
  private backoffDelay(attempt: number, remainingMs: number): number {
    const exp = this.pollBaseDelayMs * Math.pow(2, attempt);
    const capped = Math.min(this.pollMaxDelayMs, exp);
    // Full jitter: sleep a random fraction of the capped window so concurrent
    // submissions don't synchronise their polls.
    const jittered = Math.floor(Math.random() * capped) + 1;
    return Math.max(1, Math.min(jittered, remainingMs));
  }

  /**
   * Submit a prepared transaction, retrying only on transient RPC failures
   * (network blips, 429/5xx, TRY_AGAIN_LATER). A definitive ERROR status or a
   * non-transient exception fails fast.
   */
  private async sendTransactionWithRetry(
    prepared: StellarSdk.Transaction,
  ): Promise<SorobanRpc.Api.SendTransactionResponse> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.sendMaxRetries; attempt++) {
      if (attempt > 0) {
        await this.delay(this.backoffDelay(attempt - 1, this.pollMaxDelayMs));
      }
      try {
        const result = await this.server.sendTransaction(prepared);

        if (result.status === 'TRY_AGAIN_LATER') {
          lastError = new Error('Soroban RPC returned TRY_AGAIN_LATER');
          this.logger.warn(
            `sendTransaction TRY_AGAIN_LATER (attempt ${attempt + 1}/${
              this.sendMaxRetries + 1
            })`,
          );
          continue;
        }

        if (result.status === 'ERROR') {
          throw new Error(
            `Transaction submission rejected: ${JSON.stringify(
              result.errorResult ?? result.status,
            )}`,
          );
        }

        return result;
      } catch (error) {
        lastError = error;
        if (
          !isTransientStellarError(error) ||
          attempt === this.sendMaxRetries
        ) {
          throw error;
        }
        this.logger.warn(
          `Transient sendTransaction error (attempt ${attempt + 1}/${
            this.sendMaxRetries + 1
          }): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    throw lastError instanceof Error
      ? lastError
      : new Error('Transaction submission failed after retries');
  }

  /**
   * Poll for final transaction status with bounded exponential backoff +
   * jitter and an overall deadline.
   *
   * - SUCCESS              -> resolve with the hash
   * - FAILED               -> throw immediately (definitive on-chain failure)
   * - NOT_FOUND / PENDING  -> keep polling (not yet in a ledger)
   * - transient RPC errors -> keep polling (never treated as a final failure)
   * - non-transient errors -> throw immediately
   *
   * On exhaustion of attempts or deadline it throws a
   * {@link TransactionPollTimeoutError} that carries the hash so the caller
   * can persist it for reconciliation instead of losing a tx that may yet
   * confirm.
   */
  private async pollTransactionStatus(hash: string): Promise<string> {
    const deadline = Date.now() + this.pollDeadlineMs;

    for (let attempt = 0; attempt < this.pollMaxAttempts; attempt++) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;

      await this.delay(this.backoffDelay(attempt, remaining));

      let txResponse: SorobanRpc.Api.GetTransactionResponse;
      try {
        txResponse = await this.server.getTransaction(hash);
      } catch (error) {
        // Transient RPC errors must not end polling — a submitted tx can
        // still confirm. Genuine (non-transient) errors fail fast.
        if (isTransientStellarError(error)) {
          this.logger.warn(
            `Transient RPC error polling ${hash} (attempt ${attempt + 1}/${
              this.pollMaxAttempts
            }): ${error instanceof Error ? error.message : String(error)}`,
          );
          continue;
        }
        throw error;
      }

      if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
        return hash;
      }

      if (txResponse.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
        throw new Error(`Transaction failed: ${hash}`);
      }

      // NOT_FOUND / PENDING: not in a ledger yet — keep polling.
    }

    throw new TransactionPollTimeoutError(hash);
  }
}
