import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { REDIS_CLIENT } from './redis-client.token';
import {
  LockBackendUnavailableError,
  LockNotAcquiredError,
} from './lock.errors';
import {
  IN_MEMORY_FALLBACK_ENV,
  isInMemoryFallbackAllowed,
} from './redis-fallback';

export interface LockRetryOptions {
  retryCount: number;
  retryDelayMs: number;
}

const DEFAULT_RETRY_OPTIONS: LockRetryOptions = {
  retryCount: 3,
  retryDelayMs: 100,
};

const MAX_TTL_MS = 30_000;

const RELEASE_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
else
  return 0
end
`;

/**
 * Distributed lock backed by Redis.
 *
 * When no Redis client is available the service follows the shared fallback
 * policy (see {@link isInMemoryFallbackAllowed}):
 * - fallback disabled (default outside tests) → fail closed: lock operations
 *   throw {@link LockBackendUnavailableError} so protected flows are rejected
 *   rather than running with no cross-instance mutual exclusion;
 * - fallback enabled → degraded single-process in-memory locking with NO
 *   cross-instance guarantee.
 */
@Injectable()
export class LockService {
  private readonly logger = new Logger(LockService.name);
  private readonly localLockMap = new Map<
    string,
    { token: string; expiresAt: number }
  >();
  private readonly inMemoryFallbackAllowed: boolean;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: any) {
    this.inMemoryFallbackAllowed = isInMemoryFallbackAllowed();

    if (!this.redis && process.env.NODE_ENV !== 'test') {
      if (this.inMemoryFallbackAllowed) {
        this.logger.warn(
          'No Redis client configured — LockService is running in DEGRADED in-memory mode. ' +
            'Locks provide NO cross-instance mutual exclusion; do not use this for ' +
            'multi-instance/serverless financial flows. Configure REDIS_HOST/REDIS_PORT.',
        );
      } else {
        this.logger.error(
          `No Redis client configured and ${IN_MEMORY_FALLBACK_ENV} is not enabled — ` +
            'LockService will FAIL CLOSED: lock-protected operations will be rejected. ' +
            `Configure Redis, or set ${IN_MEMORY_FALLBACK_ENV}=true to allow the ` +
            'single-process in-memory fallback (unsafe for multi-instance deployments).',
        );
      }
    }
  }

  private assertInMemoryFallbackAllowed(): void {
    if (!this.inMemoryFallbackAllowed) {
      throw new LockBackendUnavailableError();
    }
  }

  async acquireLock(key: string, ttlMs: number): Promise<string | null> {
    if (ttlMs > MAX_TTL_MS) {
      throw new Error(
        `Lock TTL exceeds maximum allowed value of ${MAX_TTL_MS}ms`,
      );
    }

    const token = randomUUID();

    if (!this.redis) {
      this.assertInMemoryFallbackAllowed();
      const lockKey = `lock:${key}`;
      const now = Date.now();
      const existing = this.localLockMap.get(lockKey);
      if (existing && existing.expiresAt > now) {
        return null;
      }
      this.localLockMap.set(lockKey, { token, expiresAt: now + ttlMs });
      return token;
    }

    const result = await this.redis.set(
      `lock:${key}`,
      token,
      'PX',
      ttlMs,
      'NX',
    );

    return result === 'OK' ? token : null;
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    if (!this.redis) {
      this.assertInMemoryFallbackAllowed();
      const lockKey = `lock:${key}`;
      const existing = this.localLockMap.get(lockKey);
      if (!existing) {
        return false;
      }
      if (existing.token !== token) {
        return false;
      }
      this.localLockMap.delete(lockKey);
      return true;
    }

    const result = await this.redis.eval(
      RELEASE_SCRIPT,
      1,
      `lock:${key}`,
      token,
    );
    return result === 1;
  }

  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
    retryOptions?: LockRetryOptions,
  ): Promise<T> {
    const { retryCount, retryDelayMs } = {
      ...DEFAULT_RETRY_OPTIONS,
      ...retryOptions,
    };

    let token: string | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      token = await this.acquireLock(key, ttlMs);
      if (token !== null) {
        break;
      }
      if (attempt < retryCount) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    if (token === null) {
      throw new LockNotAcquiredError();
    }

    try {
      return await fn();
    } finally {
      const released = await this.releaseLock(key, token);
      if (!released) {
        this.logger.warn(
          `Lock for key "${key}" expired before explicit release — lock may have been held too long`,
        );
      }
    }
  }
}
