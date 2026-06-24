import { Injectable, Inject, Logger } from '@nestjs/common';
import { REDIS_CLIENT } from '../lock/redis-client.token';
import {
  IN_MEMORY_FALLBACK_ENV,
  isInMemoryFallbackAllowed,
} from '../lock/redis-fallback';
import {
  IdempotencyBackendUnavailableError,
  IdempotencyKeyMissingError,
} from './idempotency.errors';

/**
 * Idempotency store backed by Redis.
 *
 * When no Redis client is available the service follows the shared fallback
 * policy (see {@link isInMemoryFallbackAllowed}):
 * - fallback disabled (default outside tests) → fail closed: operations throw
 *   {@link IdempotencyBackendUnavailableError} rather than running with
 *   idempotency that holds only within a single process;
 * - fallback enabled → degraded single-process in-memory store with NO
 *   cross-instance single-execution guarantee.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  private readonly localStore = new Map<
    string,
    { value: string; expiresAt: number }
  >();
  private readonly inMemoryFallbackAllowed: boolean;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: any) {
    this.inMemoryFallbackAllowed = isInMemoryFallbackAllowed();

    if (!this.redis && process.env.NODE_ENV !== 'test') {
      if (this.inMemoryFallbackAllowed) {
        this.logger.warn(
          'No Redis client configured — IdempotencyService is running in DEGRADED ' +
            'in-memory mode. Single-execution holds only within one process; do not ' +
            'rely on it for multi-instance/serverless financial flows. Configure REDIS_HOST/REDIS_PORT.',
        );
      } else {
        this.logger.error(
          `No Redis client configured and ${IN_MEMORY_FALLBACK_ENV} is not enabled — ` +
            'IdempotencyService will FAIL CLOSED: idempotent operations will be rejected. ' +
            `Configure Redis, or set ${IN_MEMORY_FALLBACK_ENV}=true to allow the ` +
            'single-process in-memory fallback (unsafe for multi-instance deployments).',
        );
      }
    }
  }

  private validateKey(key: string): void {
    if (!key) {
      throw new IdempotencyKeyMissingError();
    }
  }

  private assertInMemoryFallbackAllowed(): void {
    if (!this.inMemoryFallbackAllowed) {
      throw new IdempotencyBackendUnavailableError();
    }
  }

  async store(key: string, result: unknown, ttlMs: number): Promise<void> {
    this.validateKey(key);
    const namespacedKey = `idempotency:${key}`;
    const serialized = JSON.stringify(result);

    if (!this.redis) {
      this.assertInMemoryFallbackAllowed();
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

    if (!this.redis) {
      this.assertInMemoryFallbackAllowed();
      const existing = this.localStore.get(namespacedKey);
      if (!existing) {
        return null;
      }
      if (existing.expiresAt <= Date.now()) {
        this.localStore.delete(namespacedKey);
        return null;
      }
      return JSON.parse(existing.value);
    }

    const value = await this.redis.get(namespacedKey);
    if (value === null || value === undefined) {
      return null;
    }
    return JSON.parse(String(value));
  }

  async process<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T> {
    const existing = await this.retrieve(key);
    if (existing !== null) {
      return existing as T;
    }
    const result = await fn();
    await this.store(key, result, ttlMs);
    return result;
  }
}
