import { IdempotencyService } from './idempotency.service';
import {
  IdempotencyBackendUnavailableError,
  IdempotencyKeyMissingError,
} from './idempotency.errors';
import { IN_MEMORY_FALLBACK_ENV } from '../lock/redis-fallback';

describe('IdempotencyService', () => {
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

  it('throws when the key is empty', async () => {
    const service = new IdempotencyService(null);
    await expect(service.retrieve('')).rejects.toBeInstanceOf(
      IdempotencyKeyMissingError,
    );
  });

  describe('with Redis available', () => {
    it('runs fn once and caches the result for subsequent calls', async () => {
      const redis = {
        get: jest.fn().mockResolvedValueOnce(null),
        setex: jest.fn().mockResolvedValue('OK'),
      };
      const service = new IdempotencyService(redis);
      const fn = jest.fn().mockResolvedValue({ ok: true });

      const first = await service.process('key1', 60_000, fn);
      expect(first).toEqual({ ok: true });
      expect(fn).toHaveBeenCalledTimes(1);
      expect(redis.setex).toHaveBeenCalledWith(
        'idempotency:key1',
        60,
        JSON.stringify({ ok: true }),
      );

      // Second call: Redis now returns the cached value, fn must not re-run.
      redis.get.mockResolvedValueOnce(JSON.stringify({ ok: true }));
      const second = await service.process('key1', 60_000, fn);
      expect(second).toEqual({ ok: true });
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Redis absent, in-memory fallback ENABLED', () => {
    // NODE_ENV=test auto-enables the in-memory fallback.
    it('caches within a single process', async () => {
      const service = new IdempotencyService(null);
      const fn = jest.fn().mockResolvedValue('value');

      await expect(service.process('k', 60_000, fn)).resolves.toBe('value');
      await expect(service.process('k', 60_000, fn)).resolves.toBe('value');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe('Redis absent, in-memory fallback DISABLED (fail closed)', () => {
    beforeEach(() => {
      process.env.NODE_ENV = 'production';
      delete process.env[IN_MEMORY_FALLBACK_ENV];
    });

    it('rejects process() instead of using the in-memory store', async () => {
      const service = new IdempotencyService(null);
      const fn = jest.fn();

      await expect(service.process('k', 60_000, fn)).rejects.toBeInstanceOf(
        IdempotencyBackendUnavailableError,
      );
      expect(fn).not.toHaveBeenCalled();
    });

    it('rejects store() and retrieve()', async () => {
      const service = new IdempotencyService(null);
      await expect(service.store('k', {}, 60_000)).rejects.toBeInstanceOf(
        IdempotencyBackendUnavailableError,
      );
      await expect(service.retrieve('k')).rejects.toBeInstanceOf(
        IdempotencyBackendUnavailableError,
      );
    });

    it('honors an explicit opt-in via the fallback env flag', async () => {
      process.env[IN_MEMORY_FALLBACK_ENV] = 'true';
      const service = new IdempotencyService(null);
      const fn = jest.fn().mockResolvedValue('value');
      await expect(service.process('k', 60_000, fn)).resolves.toBe('value');
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
