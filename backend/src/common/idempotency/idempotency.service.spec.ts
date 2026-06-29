import { IdempotencyService } from './idempotency.service';
import {
  IdempotencyInProgressError,
  IdempotencyKeyMissingError,
} from './idempotency.errors';

/**
 * Minimal in-memory stand-in for the subset of the ioredis API the service
 * uses. Each method body runs synchronously (no internal await), so concurrent
 * calls never interleave mid-operation — matching Redis's single-command
 * atomicity, which is exactly what `SET ... NX` relies on.
 */
class MockRedis {
  private readonly store = new Map<
    string,
    { value: string; expireAt: number }
  >();

  private alive(key: string): { value: string; expireAt: number } | undefined {
    const e = this.store.get(key);
    if (!e) return undefined;
    if (e.expireAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return e;
  }

  async set(
    key: string,
    value: string,
    ...args: unknown[]
  ): Promise<'OK' | null> {
    let px: number | undefined;
    let nx = false;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === 'PX') px = Number(args[i + 1]);
      if (args[i] === 'NX') nx = true;
    }
    if (nx && this.alive(key)) {
      return null;
    }
    this.store.set(key, {
      value: String(value),
      expireAt: px ? Date.now() + px : Number.POSITIVE_INFINITY,
    });
    return 'OK';
  }

  async setex(key: string, seconds: number, value: string): Promise<'OK'> {
    this.store.set(key, {
      value: String(value),
      expireAt: Date.now() + seconds * 1000,
    });
    return 'OK';
  }

  async get(key: string): Promise<string | null> {
    return this.alive(key)?.value ?? null;
  }

  async del(key: string): Promise<number> {
    return this.store.delete(key) ? 1 : 0;
  }

  /** Directly seed a raw value, bypassing the public API (for setup). */
  seed(key: string, value: string, ttlMs = 60_000): void {
    this.store.set(key, { value, expireAt: Date.now() + ttlMs });
  }
}

const tick = () => new Promise((r) => setImmediate(r));

describe('IdempotencyService', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    // Keep the wait loop fast so the suite stays quick.
    process.env.IDEMPOTENCY_WAIT_TIMEOUT_MS = '1000';
    process.env.IDEMPOTENCY_POLL_INTERVAL_MS = '5';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe.each([
    ['in-memory fallback', () => new IdempotencyService(null)],
    ['redis backend', () => new IdempotencyService(new MockRedis())],
  ])('%s', (_label, makeService) => {
    let service: IdempotencyService;

    beforeEach(() => {
      service = makeService();
    });

    it('rejects an empty key', async () => {
      await expect(service.process('', 1000, async () => 1)).rejects.toThrow(
        IdempotencyKeyMissingError,
      );
    });

    it('runs fn exactly once for concurrent duplicate keys', async () => {
      let runs = 0;
      const fn = async () => {
        runs++;
        await tick();
        return { ran: runs };
      };

      const results = await Promise.all(
        Array.from({ length: 20 }, () => service.process('order-1', 5000, fn)),
      );

      // fn must have executed a single time despite 20 parallel callers.
      expect(runs).toBe(1);
      // every caller observes the same memoised result.
      for (const r of results) {
        expect(r).toEqual({ ran: 1 });
      }
    });

    it('returns the cached result on a later call without re-running fn', async () => {
      const fn = jest.fn(async () => ({ value: 42 }));

      const first = await service.process('k', 5000, fn);
      const second = await service.process('k', 5000, fn);

      expect(first).toEqual({ value: 42 });
      expect(second).toEqual({ value: 42 });
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('releases the reservation when fn fails so a retry can run', async () => {
      const fail = jest.fn(async () => {
        throw new Error('boom');
      });
      await expect(service.process('k', 5000, fail)).rejects.toThrow('boom');

      // The failed attempt must not have memoised anything — a retry runs fn.
      const ok = jest.fn(async () => ({ value: 'recovered' }));
      const result = await service.process('k', 5000, ok);

      expect(result).toEqual({ value: 'recovered' });
      expect(fail).toHaveBeenCalledTimes(1);
      expect(ok).toHaveBeenCalledTimes(1);
    });

    it('does not memoise concurrent callers onto a failed execution', async () => {
      let calls = 0;
      const fn = async () => {
        calls++;
        await tick();
        throw new Error('always fails');
      };

      const settled = await Promise.allSettled(
        Array.from({ length: 5 }, () => service.process('k', 5000, fn)),
      );

      // All callers see a failure (none get a phantom cached success)...
      for (const s of settled) {
        expect(s.status).toBe('rejected');
      }
      // ...and the winner ran fn once; losers waited then took over / re-checked,
      // so fn runs at least once but is never memoised as a success.
      expect(calls).toBeGreaterThanOrEqual(1);
    });
  });

  describe('waiter behaviour (redis backend)', () => {
    beforeAll(() => {
      process.env.IDEMPOTENCY_WAIT_TIMEOUT_MS = '1000';
      process.env.IDEMPOTENCY_POLL_INTERVAL_MS = '5';
    });

    it('a concurrent caller waits for and returns the in-progress result', async () => {
      const redis = new MockRedis();
      const service = new IdempotencyService(redis);

      let resolveFn: (v: { ok: boolean }) => void;
      const gate = new Promise<{ ok: boolean }>((res) => {
        resolveFn = res;
      });
      const winnerFn = jest.fn(() => gate);
      const loserFn = jest.fn(async () => ({ ok: false }));

      const winner = service.process('k', 5000, winnerFn);
      await tick(); // let the winner reserve the key first
      const loser = service.process('k', 5000, loserFn);

      // Complete the winner; the loser must resolve to the winner's value.
      resolveFn!({ ok: true });

      expect(await winner).toEqual({ ok: true });
      expect(await loser).toEqual({ ok: true });
      expect(winnerFn).toHaveBeenCalledTimes(1);
      expect(loserFn).not.toHaveBeenCalled();
    });

    it('throws IdempotencyInProgressError when the holder never completes', async () => {
      process.env.IDEMPOTENCY_WAIT_TIMEOUT_MS = '150';
      const redis = new MockRedis();
      const service = new IdempotencyService(redis);

      // Seed a pending reservation that will never resolve.
      redis.seed('idempotency:stuck', JSON.stringify({ __idem: 'pending' }));

      const fn = jest.fn(async () => ({ ok: true }));
      await expect(service.process('stuck', 5000, fn)).rejects.toBeInstanceOf(
        IdempotencyInProgressError,
      );
      // It must never silently double-run while another holder is in progress.
      expect(fn).not.toHaveBeenCalled();

      process.env.IDEMPOTENCY_WAIT_TIMEOUT_MS = '1000';
    });

    it('treats a legacy plain stored value as a completed result', async () => {
      const redis = new MockRedis();
      const service = new IdempotencyService(redis);

      // store() writes un-enveloped JSON (backward-compat wire format).
      await service.store('legacy', { legacy: true }, 5000);

      const fn = jest.fn(async () => ({ legacy: false }));
      const result = await service.process('legacy', 5000, fn);

      expect(result).toEqual({ legacy: true });
      expect(fn).not.toHaveBeenCalled();
    });
  });
});
