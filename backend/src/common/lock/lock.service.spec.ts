import { LockService } from './lock.service';
import {
  LockBackendUnavailableError,
  LockNotAcquiredError,
} from './lock.errors';
import { IN_MEMORY_FALLBACK_ENV } from './redis-fallback';

describe('LockService', () => {
  const ORIGINAL_NODE_ENV = process.env.NODE_ENV;
  const ORIGINAL_FALLBACK = process.env[IN_MEMORY_FALLBACK_ENV];

  afterEach(() => {
    process.env.NODE_ENV = ORIGINAL_NODE_ENV;
    if (ORIGINAL_FALLBACK === undefined) {
      delete process.env[IN_MEMORY_FALLBACK_ENV];
    } else {
      process.env[IN_MEMORY_FALLBACK_ENV] = ORIGINAL_FALLBACK;
    }
    jest.restoreAllMocks();
  });

  describe('with Redis available', () => {
    function makeRedis() {
      return {
        set: jest.fn(),
        eval: jest.fn(),
      };
    }

    it('acquires a lock when SET NX returns OK and returns the token', async () => {
      const redis = makeRedis();
      redis.set.mockResolvedValue('OK');
      const service = new LockService(redis);

      const token = await service.acquireLock('payment:1', 5000);

      expect(token).toEqual(expect.any(String));
      expect(redis.set).toHaveBeenCalledWith(
        'lock:payment:1',
        token,
        'PX',
        5000,
        'NX',
      );
    });

    it('returns null when the key is already held (SET NX not OK)', async () => {
      const redis = makeRedis();
      redis.set.mockResolvedValue(null);
      const service = new LockService(redis);

      await expect(service.acquireLock('payment:1', 5000)).resolves.toBeNull();
    });

    it('releases only when the stored token matches (eval returns 1)', async () => {
      const redis = makeRedis();
      redis.eval.mockResolvedValueOnce(1).mockResolvedValueOnce(0);
      const service = new LockService(redis);

      await expect(service.releaseLock('k', 'tok')).resolves.toBe(true);
      await expect(service.releaseLock('k', 'other')).resolves.toBe(false);
    });
  });

  describe('Redis absent, in-memory fallback ENABLED', () => {
    // NODE_ENV=test auto-enables the in-memory fallback.
    it('enforces mutual exclusion within a single process', async () => {
      const service = new LockService(null);

      const first = await service.acquireLock('payment:1', 5000);
      const second = await service.acquireLock('payment:1', 5000);

      expect(first).toEqual(expect.any(String));
      expect(second).toBeNull();

      await service.releaseLock('payment:1', first as string);
      const third = await service.acquireLock('payment:1', 5000);
      expect(third).toEqual(expect.any(String));
    });

    it('does NOT provide cross-instance exclusivity (two processes both acquire)', async () => {
      // Two LockService instances simulate two processes, each with its own
      // in-memory map. Both acquiring the same key proves the in-memory mode
      // carries no cross-instance guarantee.
      const instanceA = new LockService(null);
      const instanceB = new LockService(null);

      const tokenA = await instanceA.acquireLock('payment:1', 5000);
      const tokenB = await instanceB.acquireLock('payment:1', 5000);

      expect(tokenA).toEqual(expect.any(String));
      expect(tokenB).toEqual(expect.any(String));
    });
  });

  describe('Redis absent, in-memory fallback DISABLED (fail closed)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env[IN_MEMORY_FALLBACK_ENV];
    });

    it('rejects acquireLock instead of using the in-memory map', async () => {
      const service = new LockService(null);
      await expect(
        service.acquireLock('payment:1', 5000),
      ).rejects.toBeInstanceOf(LockBackendUnavailableError);
    });

    it('rejects releaseLock as well', async () => {
      const service = new LockService(null);
      await expect(
        service.releaseLock('payment:1', 'tok'),
      ).rejects.toBeInstanceOf(LockBackendUnavailableError);
    });

    it('withLock fails closed and never runs the protected fn', async () => {
      const service = new LockService(null);
      const fn = jest.fn().mockResolvedValue('done');

      await expect(
        service.withLock('payment:1', 5000, fn, {
          retryCount: 0,
          retryDelayMs: 0,
        }),
      ).rejects.toBeInstanceOf(LockBackendUnavailableError);
      expect(fn).not.toHaveBeenCalled();
    });

    it('honors an explicit opt-in via the fallback env flag', async () => {
      process.env[IN_MEMORY_FALLBACK_ENV] = 'true';
      const service = new LockService(null);
      await expect(service.acquireLock('payment:1', 5000)).resolves.toEqual(
        expect.any(String),
      );
    });
  });

  describe('withLock', () => {
    it('throws LockNotAcquiredError after exhausting retries', async () => {
      const redis = { set: jest.fn().mockResolvedValue(null), eval: jest.fn() };
      const service = new LockService(redis);
      const fn = jest.fn();

      await expect(
        service.withLock('k', 5000, fn, { retryCount: 1, retryDelayMs: 0 }),
      ).rejects.toBeInstanceOf(LockNotAcquiredError);
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
