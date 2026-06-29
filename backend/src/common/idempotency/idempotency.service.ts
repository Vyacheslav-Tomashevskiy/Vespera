import { Injectable, Inject, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from '../lock/redis-client.token';
import {
  IdempotencyKeyMissingError,
  IdempotencyInProgressError,
} from './idempotency.errors';

/**
 * Internal envelope used by {@link IdempotencyService.process} to distinguish a
 * key that is *reserved but still running* from one that has *completed*.
 *
 *  - `pending`  → a caller has atomically reserved the key and is executing `fn()`.
 *  - `done`     → `fn()` finished; `value` is the memoised result.
 *
 * `store()` / `retrieve()` keep writing plain (un-enveloped) JSON for backward
 * compatibility, so {@link IdempotencyService.read} also accepts a legacy value
 * and treats it as a completed result.
 */
type IdempotencyEnvelope =
  | { __idem: 'pending' }
  | { __idem: 'done'; value: unknown };

type ReadResult =
  | { status: 'missing' }
  | { status: 'pending' }
  | { status: 'done'; value: unknown };

const PENDING_ENVELOPE = JSON.stringify({ __idem: 'pending' });

const DEFAULT_WAIT_TIMEOUT_MS = 5_000;
const DEFAULT_POLL_INTERVAL_MS = 50;

@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  private readonly localStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();

  /** Max time a losing (concurrent) caller waits for the in-progress one. */
  private readonly waitTimeoutMs: number;
  /** Poll cadence while waiting for an in-progress key to resolve. */
  private readonly pollIntervalMs: number;

  private warnedInMemory = false;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: any) {
    this.waitTimeoutMs = this.readEnvInt(
      'IDEMPOTENCY_WAIT_TIMEOUT_MS',
      DEFAULT_WAIT_TIMEOUT_MS,
    );
    this.pollIntervalMs = this.readEnvInt(
      'IDEMPOTENCY_POLL_INTERVAL_MS',
      DEFAULT_POLL_INTERVAL_MS,
    );
  }

  private readEnvInt(name: string, fallback: number): number {
    const raw = process.env[name];
    if (raw === undefined || raw === '') {
      return fallback;
    }
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private validateKey(key: string): void {
    if (!key) {
      throw new IdempotencyKeyMissingError();
    }
  }

  async store(key: string, result: unknown, ttlMs: number): Promise<void> {
    this.validateKey(key);
    const namespacedKey = `idempotency:${key}`;
    const serialized = JSON.stringify(result);

    if (!this.redis) {
      this.localStore.set(namespacedKey, {
        value: serialized,
        expiresAt: Date.now() + ttlMs,
      });
      return;
    }

    const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
    await this.redis.setex(namespacedKey, ttlSeconds, serialized);
  }

  async retrieve(key: string): Promise<unknown> {
    this.validateKey(key);
    const namespacedKey = `idempotency:${key}`;
    const raw = await this.readRaw(namespacedKey);
    if (raw === null) {
      return null;
    }
    const parsed = JSON.parse(raw);
    // A reserved-but-unfinished key is, from the caller's perspective, "no
    // result yet" — never surface the internal pending marker.
    if (this.isPendingEnvelope(parsed)) {
      return null;
    }
    if (this.isDoneEnvelope(parsed)) {
      return parsed.value;
    }
    return parsed;
  }

  /**
   * Run `fn` at most once per `key`, even under concurrent callers.
   *
   * The winning caller atomically reserves the key with an in-progress marker
   * (Redis `SET key NX PX`, or a synchronous check-and-set on the in-memory
   * fallback), runs `fn`, then overwrites the marker with the completed result.
   * Losing callers wait for that result instead of re-running `fn`. If the
   * winner fails, it releases the reservation so a subsequent caller can retry.
   *
   * Guarantees:
   *  - With Redis: single execution across all instances/processes.
   *  - Without Redis (in-memory fallback): single execution **within this
   *    process only**. Across multiple processes the guarantee degrades to none,
   *    because the reservation map is not shared. A one-time warning is logged.
   *
   * @throws IdempotencyInProgressError if a concurrent execution is still
   *   running after `waitTimeoutMs` (never silently double-runs).
   */
  async process<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.validateKey(key);
    if (!this.redis) {
      this.warnInMemoryOnce();
    }
    const namespacedKey = `idempotency:${key}`;
    const deadline = Date.now() + this.waitTimeoutMs;

    // Loop so that a caller which finds the key already completed returns it,
    // one which finds it free reserves and runs, and one which finds it
    // in-progress waits — re-checking after each backoff.
    for (;;) {
      const current = await this.read(namespacedKey);

      if (current.status === 'done') {
        return current.value as T;
      }

      if (current.status === 'missing') {
        const reserved = await this.reserve(namespacedKey, ttlMs);
        if (reserved) {
          try {
            const result = await fn();
            await this.complete(namespacedKey, result, ttlMs);
            return result;
          } catch (err) {
            // Don't memoise failures, and free the reservation so the next
            // caller can retry rather than block until the marker expires.
            await this.release(namespacedKey);
            throw err;
          }
        }
        // Lost the reservation race — another caller won; fall through to wait.
      }

      // status === 'pending' (or we just lost the reservation): wait and retry.
      if (Date.now() >= deadline) {
        throw new IdempotencyInProgressError(key);
      }
      await this.sleep(this.pollIntervalMs);
    }
  }

  /** Atomically reserve the key with an in-progress marker. */
  private async reserve(
    namespacedKey: string,
    ttlMs: number,
  ): Promise<boolean> {
    if (!this.redis) {
      // Single-threaded JS: this check-and-set runs with no intervening await,
      // so it is atomic within the process.
      const existing = this.localStore.get(namespacedKey);
      const now = Date.now();
      if (existing && existing.expiresAt > now) {
        return false;
      }
      this.localStore.set(namespacedKey, {
        value: PENDING_ENVELOPE,
        expiresAt: now + ttlMs,
      });
      return true;
    }

    const result = await this.redis.set(
      namespacedKey,
      PENDING_ENVELOPE,
      'PX',
      ttlMs,
      'NX',
    );
    return result === 'OK';
  }

  /** Overwrite the reservation with the completed result. */
  private async complete(
    namespacedKey: string,
    result: unknown,
    ttlMs: number,
  ): Promise<void> {
    const envelope: IdempotencyEnvelope = { __idem: 'done', value: result };
    const serialized = JSON.stringify(envelope);

    if (!this.redis) {
      this.localStore.set(namespacedKey, {
        value: serialized,
        expiresAt: Date.now() + ttlMs,
      });
      return;
    }

    await this.redis.set(namespacedKey, serialized, 'PX', Math.max(1, ttlMs));
  }

  /** Release an unfinished reservation (after a failure). */
  private async release(namespacedKey: string): Promise<void> {
    if (!this.redis) {
      const existing = this.localStore.get(namespacedKey);
      // Only drop our own pending marker — never a result that another caller
      // may have completed in the meantime.
      if (existing && existing.value === PENDING_ENVELOPE) {
        this.localStore.delete(namespacedKey);
      }
      return;
    }
    await this.redis.del(namespacedKey);
  }

  /** Classify the current state of a key. */
  private async read(namespacedKey: string): Promise<ReadResult> {
    const raw = await this.readRaw(namespacedKey);
    if (raw === null) {
      return { status: 'missing' };
    }
    const parsed = JSON.parse(raw);
    if (this.isPendingEnvelope(parsed)) {
      return { status: 'pending' };
    }
    if (this.isDoneEnvelope(parsed)) {
      return { status: 'done', value: parsed.value };
    }
    // Legacy plain value written by store(): treat as completed.
    return { status: 'done', value: parsed };
  }

  /** Read the raw stored string for a namespaced key, honouring TTL. */
  private async readRaw(namespacedKey: string): Promise<string | null> {
    if (!this.redis) {
      const existing = this.localStore.get(namespacedKey);
      if (!existing) {
        return null;
      }
      if (existing.expiresAt <= Date.now()) {
        this.localStore.delete(namespacedKey);
        return null;
      }
      return existing.value;
    }

    const value = await this.redis.get(namespacedKey);
    if (value === null || value === undefined) {
      return null;
    }
    return String(value);
  }

  private isPendingEnvelope(parsed: unknown): parsed is { __idem: 'pending' } {
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { __idem?: unknown }).__idem === 'pending'
    );
  }

  private isDoneEnvelope(
    parsed: unknown,
  ): parsed is { __idem: 'done'; value: unknown } {
    return (
      typeof parsed === 'object' &&
      parsed !== null &&
      (parsed as { __idem?: unknown }).__idem === 'done'
    );
  }

  private warnInMemoryOnce(): void {
    if (this.warnedInMemory) {
      return;
    }
    this.warnedInMemory = true;
    this.logger.warn(
      'IdempotencyService is running without Redis (in-memory fallback). ' +
        'Single-execution is guaranteed only within this process; across ' +
        'multiple instances duplicate requests may each run once.',
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
