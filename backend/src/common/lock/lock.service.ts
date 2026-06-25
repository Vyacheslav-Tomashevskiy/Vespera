import { Injectable, Inject, Logger, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { REDIS_CLIENT } from "./redis-client.token";
import { LockNotAcquiredError, RedisUnavailableError } from "./lock.errors";

export interface LockRetryOptions {
  retryCount: number;
  retryDelayMs: number;
}

export interface LockServiceConfig {
  /**
   * If true, operations requiring locks will fail when Redis is unavailable
   * rather than falling back to in-memory locks (unsafe for distributed systems).
   * Default: true in production, false in test environments.
   */
  failClosedWithoutRedis?: boolean;
  /**
   * If true, allows in-memory fallback (useful for single-instance dev/test).
   * Default: false
   */
  allowInMemoryFallback?: boolean;
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

@Injectable()
export class LockService implements OnModuleInit {
  private readonly logger = new Logger(LockService.name);
  private readonly localLockMap = new Map<
    string,
    { token: string; expiresAt: number }
  >();
  private redisHealthy = false;
  private readonly config: LockServiceConfig;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: any,
    @Inject("LOCK_SERVICE_CONFIG")
    config?: LockServiceConfig,
  ) {
    const isProduction = process.env.NODE_ENV === "production";
    this.config = {
      failClosedWithoutRedis: config?.failClosedWithoutRedis ?? isProduction,
      allowInMemoryFallback: config?.allowInMemoryFallback ?? !isProduction,
    };
  }

  async onModuleInit(): Promise<void> {
    await this.checkRedisHealth();
    if (!this.redisHealthy && !this.config.allowInMemoryFallback) {
      this.logger.error(
        "Redis is unavailable and in-memory fallback is disabled. " +
          "Distributed locking will fail closed for safety.",
      );
    } else if (!this.redisHealthy && this.config.allowInMemoryFallback) {
      this.logger.warn(
        "⚠️  DEGRADED MODE: Redis unavailable, using in-memory locks. " +
          "This provides NO cross-instance protection. " +
          "Do NOT use in production multi-instance deployments.",
      );
    }
  }

  /**
   * Check Redis connectivity and update health status
   */
  async checkRedisHealth(): Promise<boolean> {
    if (!this.redis) {
      this.redisHealthy = false;
      return false;
    }
    try {
      await this.redis.ping();
      this.redisHealthy = true;
      return true;
    } catch (error) {
      this.redisHealthy = false;
      this.logger.warn("Redis health check failed", error);
      return false;
    }
  }

  /**
   * Returns true if Redis is available and healthy
   */
  isRedisAvailable(): boolean {
    return this.redisHealthy && this.redis !== null;
  }

  /**
   * Returns the current lock mode for observability
   */
  getLockMode(): "redis" | "in-memory" | "fail-closed" {
    if (this.isRedisAvailable()) return "redis";
    if (this.config.allowInMemoryFallback) return "in-memory";
    return "fail-closed";
  }

  async acquireLock(
    key: string,
    ttlMs: number,
    options?: { requireDistributed?: boolean },
  ): Promise<string | null> {
    if (ttlMs > MAX_TTL_MS) {
      throw new Error(
        `Lock TTL exceeds maximum allowed value of ${MAX_TTL_MS}ms`,
      );
    }

    const token = randomUUID();
    const lockKey = `lock:${key}`;

    // Try Redis first
    if (this.redis) {
      try {
        const result = await this.redis.set(lockKey, token, "PX", ttlMs, "NX");
        if (result === "OK") {
          this.redisHealthy = true;
          return token;
        }
        return null; // Lock held by another process
      } catch (error) {
        this.redisHealthy = false;
        this.logger.warn("Redis lock acquisition failed, checking fallback", error);
      }
    }

    // Redis unavailable - check if we should fail closed
    if (options?.requireDistributed || this.config.failClosedWithoutRedis) {
      throw new RedisUnavailableError(
        "Distributed lock required but Redis is unavailable. " +
          "Operation rejected for safety (fail-closed mode).",
      );
    }

    // Fallback to in-memory (only if explicitly allowed)
    if (!this.config.allowInMemoryFallback) {
      throw new RedisUnavailableError(
        "Redis unavailable and in-memory fallback is disabled.",
      );
    }

    this.logger.warn(
      `Using in-memory lock for key "${key}" - NO cross-instance protection`,
    );

    const now = Date.now();
    const existing = this.localLockMap.get(lockKey);
    if (existing && existing.expiresAt > now) {
      return null;
    }
    this.localLockMap.set(lockKey, { token, expiresAt: now + ttlMs });
    return token;
  }

  async releaseLock(key: string, token: string): Promise<boolean> {
    const lockKey = `lock:${key}`;

    // Try Redis first
    if (this.redis && this.redisHealthy) {
      try {
        const result = await this.redis.eval(RELEASE_SCRIPT, 1, lockKey, token);
        return result === 1;
      } catch (error) {
        this.redisHealthy = false;
        this.logger.warn("Redis lock release failed", error);
      }
    }

    // Fallback to in-memory release
    const existing = this.localLockMap.get(lockKey);
    if (!existing || existing.token !== token) {
      return false;
    }
    this.localLockMap.delete(lockKey);
    return true;
  }

  async withLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
    options?: LockRetryOptions & { requireDistributed?: boolean },
  ): Promise<T> {
    const { retryCount, retryDelayMs, requireDistributed } = {
      ...DEFAULT_RETRY_OPTIONS,
      ...options,
    };

    let token: string | null = null;

    for (let attempt = 0; attempt <= retryCount; attempt++) {
      token = await this.acquireLock(key, ttlMs, { requireDistributed });
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

  /**
   * Variant that always requires distributed locking (for financial operations)
   */
  async withDistributedLock<T>(
    key: string,
    ttlMs: number,
    fn: () => Promise<T>,
    retryOptions?: LockRetryOptions,
  ): Promise<T> {
    return this.withLock(key, ttlMs, fn, {
      ...retryOptions,
      requireDistributed: true,
    });
  }
}
