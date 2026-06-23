import {
  Injectable,
  Logger,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Brackets,
  IsNull,
  Not,
  OptimisticLockVersionMismatchError,
  Repository,
} from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import {
  AnchorTransaction,
  AnchorTransactionType,
  AnchorTransactionStatus,
} from '../../transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../../transactions/entities/supported-currency.entity';
import { DepositRequestDto } from '../dto/deposit-request.dto';
import { WithdrawRequestDto } from '../dto/withdraw-request.dto';
import { QueryAnchorTransactionsDto } from '../dto/query-anchor-transactions.dto';
import { AnchorWebhookDto } from '../dto/anchor-webhook.dto';
import {
  isTransientStellarError,
  extractStellarErrorMessage,
} from './stellar-transaction-resilience';

const TERMINAL_STATUSES: ReadonlySet<AnchorTransactionStatus> = new Set([
  AnchorTransactionStatus.COMPLETED,
  AnchorTransactionStatus.REFUNDED,
  AnchorTransactionStatus.FAILED,
]);

const PROCESSED_EVENT_WINDOW = 200;

interface AnchorDepositResponse {
  id: string;
  how: string;
  eta?: number;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
}

interface AnchorWithdrawResponse {
  id: string;
  account_id: string;
  memo_type?: string;
  memo?: string;
  eta?: number;
  min_amount?: number;
  max_amount?: number;
  fee_fixed?: number;
  fee_percent?: number;
}

interface AnchorTransactionResponse {
  transaction: {
    id: string;
    status: string;
    status_eta?: number;
    amount_in?: string;
    amount_out?: string;
    amount_fee?: string;
    stellar_transaction_id?: string;
    external_transaction_id?: string;
    message?: string;
  };
}

interface AnchorTransactionStats {
  total: number;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  refunded: number;
  verified: number;
  averageTimeToAnchorSeconds: number;
}

@Injectable()
export class AnchorService {
  private readonly logger = new Logger(AnchorService.name);
  private readonly axiosInstance: AxiosInstance;
  private readonly anchorApiUrl: string;
  private readonly anchorApiKey: string;
  private readonly supportedCurrencies: string[];
  private readonly anchorTimeoutMs: number;
  private readonly anchorMaxAttempts: number;
  private readonly anchorRetryBaseDelayMs: number;

  constructor(
    @InjectRepository(AnchorTransaction)
    private anchorTransactionRepo: Repository<AnchorTransaction>,
    @InjectRepository(SupportedCurrency)
    private supportedCurrencyRepo: Repository<SupportedCurrency>,
    private configService: ConfigService,
  ) {
    this.anchorApiUrl = this.configService.get<string>('ANCHOR_API_URL') || '';
    this.anchorApiKey = this.configService.get<string>('ANCHOR_API_KEY') || '';
    this.supportedCurrencies =
      this.configService
        .get<string>('SUPPORTED_FIAT_CURRENCIES', 'USD,EUR,GBP,NGN')
        .split(',') || [];

    // Resilience knobs are env-configurable so deployments can tune anchor
    // timeouts/retries without a code change; defaults preserve the
    // previous single-shot 30s behaviour at attempt count 1.
    this.anchorTimeoutMs =
      Number(this.configService.get<string>('ANCHOR_HTTP_TIMEOUT_MS')) || 30000;
    this.anchorMaxAttempts = Math.max(
      1,
      Number(this.configService.get<string>('ANCHOR_HTTP_MAX_ATTEMPTS')) || 3,
    );
    this.anchorRetryBaseDelayMs =
      Number(this.configService.get<string>('ANCHOR_HTTP_RETRY_DELAY_MS')) ||
      500;

    this.axiosInstance = axios.create({
      baseURL: this.anchorApiUrl,
      headers: {
        Authorization: `Bearer ${this.anchorApiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: this.anchorTimeoutMs,
    });
  }

  /**
   * Run an idempotent anchor HTTP call with bounded exponential backoff.
   * Only transient failures (429 / 5xx / network / timeout, classified by
   * the shared isTransientStellarError) are retried; a deterministic 4xx
   * fails fast on the first attempt. Attempt count, base delay and request
   * timeout are env-configurable (ANCHOR_HTTP_MAX_ATTEMPTS /
   * ANCHOR_HTTP_RETRY_DELAY_MS / ANCHOR_HTTP_TIMEOUT_MS) and mirror the
   * retry strategy stellar.service already applies to transaction
   * submission so anchor resilience is consistent with the rest of the
   * codebase rather than a new bespoke pattern.
   */
  private async requestWithRetry<T>(
    label: string,
    request: () => Promise<T>,
  ): Promise<T> {
    let delayMs = this.anchorRetryBaseDelayMs;
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.anchorMaxAttempts; attempt++) {
      try {
        return await request();
      } catch (error) {
        lastError = error;

        if (
          isTransientStellarError(error) &&
          attempt < this.anchorMaxAttempts
        ) {
          this.logger.warn(
            `Transient anchor ${label} failure (attempt ${attempt}/${this.anchorMaxAttempts}): ` +
              `${extractStellarErrorMessage(error)}; retrying in ${delayMs}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          delayMs *= 2;
          continue;
        }

        throw error;
      }
    }

    // The loop only leaves via return or throw; this satisfies the
    // compiler's need for a terminal statement on the fall-through path.
    throw lastError;
  }

  async initiateDeposit(dto: DepositRequestDto): Promise<AnchorTransaction> {
    this.logger.log(`Initiating deposit for ${dto.walletAddress}`);

    await this.validateCurrency(dto.currency);

    const transaction = this.anchorTransactionRepo.create({
      type: AnchorTransactionType.DEPOSIT,
      status: AnchorTransactionStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency,
      walletAddress: dto.walletAddress,
      paymentMethod: dto.type,
    });

    await this.anchorTransactionRepo.save(transaction);

    try {
      const response = await this.requestWithRetry('deposit', () =>
        this.axiosInstance.post<AnchorDepositResponse>(
          '/sep24/transactions/deposit/interactive',
          {
            asset_code: dto.currency,
            account: dto.walletAddress,
            amount: dto.amount.toString(),
            type: dto.type,
          },
        ),
      );

      transaction.anchorTransactionId = response.data.id;
      transaction.metadata = {
        how: response.data.how,
        eta: response.data.eta,
        fee_fixed: response.data.fee_fixed,
        fee_percent: response.data.fee_percent,
      };

      await this.anchorTransactionRepo.save(transaction);
      this.logger.log(`Deposit initiated: ${transaction.id}`);

      return transaction;
    } catch (error) {
      // A transient infra failure (429/5xx/network) that survived the
      // retries must not burn the deposit as FAILED — leave it PENDING so
      // it can be reconciled or retried, and surface the outage as a 503.
      if (isTransientStellarError(error)) {
        this.logger.error(
          `Deposit ${transaction.id} left PENDING after transient anchor failure: ` +
            extractStellarErrorMessage(error),
        );
        throw new ServiceUnavailableException(
          'Anchor temporarily unavailable; deposit kept pending for retry',
        );
      }
      transaction.status = AnchorTransactionStatus.FAILED;
      await this.anchorTransactionRepo.save(transaction);
      this.logger.error(`Deposit failed: ${error.message}`);
      throw new BadRequestException('Failed to initiate deposit');
    }
  }

  async initiateWithdrawal(
    dto: WithdrawRequestDto,
  ): Promise<AnchorTransaction> {
    this.logger.log(`Initiating withdrawal for ${dto.walletAddress}`);

    await this.validateCurrency(dto.currency);

    const transaction = this.anchorTransactionRepo.create({
      type: AnchorTransactionType.WITHDRAWAL,
      status: AnchorTransactionStatus.PENDING,
      amount: dto.amount,
      currency: dto.currency,
      walletAddress: dto.walletAddress,
      destination: dto.destination,
    });

    await this.anchorTransactionRepo.save(transaction);

    try {
      const response = await this.requestWithRetry('withdrawal', () =>
        this.axiosInstance.post<AnchorWithdrawResponse>(
          '/sep24/transactions/withdraw/interactive',
          {
            asset_code: dto.currency,
            account: dto.walletAddress,
            amount: dto.amount.toString(),
            dest: dto.destination,
          },
        ),
      );

      transaction.anchorTransactionId = response.data.id;
      transaction.metadata = {
        account_id: response.data.account_id,
        memo_type: response.data.memo_type,
        memo: response.data.memo,
        eta: response.data.eta,
        fee_fixed: response.data.fee_fixed,
        fee_percent: response.data.fee_percent,
      };

      await this.anchorTransactionRepo.save(transaction);
      this.logger.log(`Withdrawal initiated: ${transaction.id}`);

      return transaction;
    } catch (error) {
      // Same fail-open-as-PENDING policy as deposits: a transient anchor
      // outage should not strand the withdrawal in a terminal FAILED state.
      if (isTransientStellarError(error)) {
        this.logger.error(
          `Withdrawal ${transaction.id} left PENDING after transient anchor failure: ` +
            extractStellarErrorMessage(error),
        );
        throw new ServiceUnavailableException(
          'Anchor temporarily unavailable; withdrawal kept pending for retry',
        );
      }
      transaction.status = AnchorTransactionStatus.FAILED;
      await this.anchorTransactionRepo.save(transaction);
      this.logger.error(`Withdrawal failed: ${error.message}`);
      throw new BadRequestException('Failed to initiate withdrawal');
    }
  }

  async getTransactionStatus(id: string): Promise<AnchorTransaction> {
    const transaction = await this.anchorTransactionRepo.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new BadRequestException('Transaction not found');
    }

    if (!transaction.anchorTransactionId) {
      return transaction;
    }

    try {
      const response = await this.requestWithRetry('status', () =>
        this.axiosInstance.get<AnchorTransactionResponse>(
          `/sep24/transaction?id=${transaction.anchorTransactionId}`,
        ),
      );
      const anchorTx = response.data.transaction;

      // Funnel polling updates through the same idempotent path as the
      // webhook so a polling tick and a webhook delivery cannot race —
      // both serialize on the row-level lock and both respect the
      // terminal-state guard.
      return await this.applyAnchorUpdate(transaction.id, {
        id: transaction.anchorTransactionId,
        status: anchorTx.status,
        event_id: `poll:${anchorTx.id}:${anchorTx.status}`,
        stellar_transaction_id: anchorTx.stellar_transaction_id,
        external_transaction_id: anchorTx.external_transaction_id,
        amount_in: anchorTx.amount_in,
        amount_out: anchorTx.amount_out,
        amount_fee: anchorTx.amount_fee,
        message: anchorTx.message,
      });
    } catch (error) {
      this.logger.error(`Failed to fetch transaction status: ${error.message}`);
      return transaction;
    }
  }

  async listTransactions(query: QueryAnchorTransactionsDto): Promise<{
    data: AnchorTransaction[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const queryBuilder =
      this.anchorTransactionRepo.createQueryBuilder('anchorTransaction');

    if (query.type) {
      queryBuilder.andWhere('anchorTransaction.type = :type', {
        type: query.type,
      });
    }

    if (query.status) {
      queryBuilder.andWhere('anchorTransaction.status = :status', {
        status: query.status,
      });
    }

    if (query.startDate) {
      queryBuilder.andWhere('anchorTransaction.createdAt >= :startDate', {
        startDate: new Date(query.startDate),
      });
    }

    if (query.endDate) {
      const endDate = new Date(query.endDate);
      endDate.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('anchorTransaction.createdAt <= :endDate', {
        endDate,
      });
    }

    if (query.search) {
      const search = `%${query.search.trim()}%`;
      queryBuilder.andWhere(
        new Brackets((qb) => {
          qb.where('anchorTransaction.anchorTransactionId ILIKE :search', {
            search,
          })
            .orWhere('anchorTransaction.stellarTransactionId ILIKE :search', {
              search,
            })
            .orWhere('anchorTransaction.walletAddress ILIKE :search', {
              search,
            });
        }),
      );
    }

    queryBuilder
      .orderBy('anchorTransaction.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  async getTransactionStats(): Promise<AnchorTransactionStats> {
    const [
      total,
      pending,
      processing,
      completed,
      failed,
      refunded,
      verified,
      terminalTransactions,
    ] = await Promise.all([
      this.anchorTransactionRepo.count(),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.PENDING },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.PROCESSING },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.COMPLETED },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.FAILED },
      }),
      this.anchorTransactionRepo.count({
        where: { status: AnchorTransactionStatus.REFUNDED },
      }),
      this.anchorTransactionRepo.count({
        where: { stellarTransactionId: Not(IsNull()) },
      }),
      this.anchorTransactionRepo.find({
        where: [
          { status: AnchorTransactionStatus.COMPLETED },
          { status: AnchorTransactionStatus.REFUNDED },
          { status: AnchorTransactionStatus.FAILED },
        ],
      }),
    ]);

    const averageTimeToAnchorSeconds =
      terminalTransactions.length > 0
        ? Math.round(
            terminalTransactions.reduce((totalSeconds, transaction) => {
              const createdAt = new Date(transaction.createdAt).getTime();
              const updatedAt = new Date(transaction.updatedAt).getTime();
              const durationSeconds = Math.max(
                0,
                Math.round((updatedAt - createdAt) / 1000),
              );
              return totalSeconds + durationSeconds;
            }, 0) / terminalTransactions.length,
          )
        : 0;

    return {
      total,
      pending,
      processing,
      completed,
      failed,
      refunded,
      verified,
      averageTimeToAnchorSeconds,
    };
  }

  async handleWebhook(payload: AnchorWebhookDto): Promise<void> {
    // Look up by the anchor's transaction id; the local record's primary
    // key isn't on the wire.
    const local = await this.anchorTransactionRepo.findOne({
      where: { anchorTransactionId: payload.id },
      select: ['id'],
    });

    if (!local) {
      // Webhook for a transaction we don't know about — log and drop
      // rather than create a synthetic record.
      this.logger.warn(
        `Webhook for unknown anchor transaction id=${payload.id}`,
      );
      return;
    }

    await this.applyAnchorUpdate(local.id, payload);
  }

  /**
   * Serialize all writes for a single anchor transaction through a row
   * lock and an event-id replay guard so concurrent webhooks and polling
   * cannot corrupt status. Returns the post-update row.
   *
   * Guards applied (in order):
   *   1. Reload under SELECT ... FOR UPDATE inside a transaction.
   *   2. If the inbound event_id has already been processed for this
   *      row, short-circuit (idempotent replay).
   *   3. If the local row is in a terminal state, refuse to regress.
   *   4. Only persist known fields from the payload — never spread the
   *      raw body.
   *   5. Update the @VersionColumn via save() so any racing writer that
   *      bypasses this path triggers OptimisticLockVersionMismatchError.
   */
  private async applyAnchorUpdate(
    localId: string,
    payload: AnchorWebhookDto,
  ): Promise<AnchorTransaction> {
    const eventId = this.deriveEventId(payload);
    const queryRunner =
      this.anchorTransactionRepo.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const repo = queryRunner.manager.getRepository(AnchorTransaction);
      const transaction = await repo.findOne({
        where: { id: localId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!transaction) {
        await queryRunner.rollbackTransaction();
        throw new BadRequestException('Transaction not found');
      }

      if (
        transaction.processedEventIds &&
        transaction.processedEventIds.includes(eventId)
      ) {
        this.logger.log(
          `Anchor event ${eventId} already processed for tx=${transaction.id}; skipping`,
        );
        await queryRunner.commitTransaction();
        return transaction;
      }

      // Sequence-monotonicity guard: if the anchor stamps payloads
      // with a `sequence` and the row has already absorbed a higher
      // one, this delivery is out-of-order and must not regress
      // state. Recording the event id makes the eventual retry of the
      // newer payload a no-op.
      const lastSequence = this.readLastSequence(transaction);
      if (
        payload.sequence !== undefined &&
        lastSequence !== undefined &&
        payload.sequence < lastSequence
      ) {
        this.logger.warn(
          `Dropping stale anchor delivery tx=${transaction.id} sequence=${payload.sequence} < last=${lastSequence}`,
        );
        transaction.processedEventIds = this.trackEventId(
          transaction.processedEventIds,
          eventId,
        );
        await repo.save(transaction);
        await queryRunner.commitTransaction();
        return transaction;
      }

      const newStatus = this.mapAnchorStatus(payload.status);

      if (
        TERMINAL_STATUSES.has(transaction.status) &&
        transaction.status !== newStatus
      ) {
        this.logger.warn(
          `Refusing to regress tx=${transaction.id} from terminal ${transaction.status} to ${newStatus}`,
        );
        transaction.processedEventIds = this.trackEventId(
          transaction.processedEventIds,
          eventId,
        );
        await repo.save(transaction);
        await queryRunner.commitTransaction();
        return transaction;
      }

      transaction.status = newStatus;
      if (payload.stellar_transaction_id) {
        transaction.stellarTransactionId = payload.stellar_transaction_id;
      }
      transaction.metadata = {
        ...(transaction.metadata ?? {}),
        ...this.extractKnownMetadata(payload),
      };
      transaction.processedEventIds = this.trackEventId(
        transaction.processedEventIds,
        eventId,
      );

      await repo.save(transaction);
      await queryRunner.commitTransaction();
      this.logger.log(
        `Anchor tx=${transaction.id} advanced to ${newStatus} via event=${eventId}`,
      );
      return transaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      if (error instanceof OptimisticLockVersionMismatchError) {
        this.logger.warn(
          `Optimistic lock conflict for anchor tx=${localId}; another writer won the race`,
        );
        const reload = await this.anchorTransactionRepo.findOne({
          where: { id: localId },
        });
        if (reload) return reload;
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private deriveEventId(payload: AnchorWebhookDto): string {
    if (payload.event_id) return payload.event_id;
    if (payload.sequence !== undefined) {
      return `${payload.id}:seq:${payload.sequence}`;
    }
    // No explicit identifier — collapse identical re-deliveries of the
    // same (id, status) pair but still let real transitions through.
    return `${payload.id}:status:${payload.status}`;
  }

  private trackEventId(
    existing: string[] | undefined,
    eventId: string,
  ): string[] {
    const next = existing ? [...existing, eventId] : [eventId];
    // Keep the list bounded so the row doesn't grow without limit; we
    // only need enough history to absorb in-flight redeliveries.
    if (next.length > PROCESSED_EVENT_WINDOW) {
      return next.slice(next.length - PROCESSED_EVENT_WINDOW);
    }
    return next;
  }

  private readLastSequence(transaction: AnchorTransaction): number | undefined {
    const stored = transaction.metadata?.last_sequence;
    return typeof stored === 'number' ? stored : undefined;
  }

  private extractKnownMetadata(
    payload: AnchorWebhookDto,
  ): Record<string, unknown> {
    const known: Record<string, unknown> = {};
    if (payload.amount_in !== undefined) known.amount_in = payload.amount_in;
    if (payload.amount_out !== undefined) known.amount_out = payload.amount_out;
    if (payload.amount_fee !== undefined) known.amount_fee = payload.amount_fee;
    if (payload.external_transaction_id !== undefined) {
      known.external_transaction_id = payload.external_transaction_id;
    }
    if (payload.message !== undefined) known.message = payload.message;
    if (payload.sequence !== undefined) known.last_sequence = payload.sequence;
    return known;
  }

  private async validateCurrency(currency: string): Promise<void> {
    if (!this.supportedCurrencies.includes(currency)) {
      throw new BadRequestException(`Currency ${currency} not supported`);
    }

    const supportedCurrency = await this.supportedCurrencyRepo.findOne({
      where: { code: currency, isActive: true },
    });

    if (!supportedCurrency) {
      throw new BadRequestException(`Currency ${currency} not configured`);
    }
  }

  private mapAnchorStatus(anchorStatus: string): AnchorTransactionStatus {
    const statusMap: Record<string, AnchorTransactionStatus> = {
      pending_user_transfer_start: AnchorTransactionStatus.PENDING,
      pending_anchor: AnchorTransactionStatus.PROCESSING,
      pending_stellar: AnchorTransactionStatus.PROCESSING,
      pending_external: AnchorTransactionStatus.PROCESSING,
      pending_trust: AnchorTransactionStatus.PROCESSING,
      pending_user: AnchorTransactionStatus.PROCESSING,
      completed: AnchorTransactionStatus.COMPLETED,
      refunded: AnchorTransactionStatus.REFUNDED,
      expired: AnchorTransactionStatus.FAILED,
      error: AnchorTransactionStatus.FAILED,
    };

    return statusMap[anchorStatus] || AnchorTransactionStatus.PENDING;
  }
}
