import { CacheService } from './cache.service';
import { Cached } from './cached.decorator';

describe('@Cached', () => {
  it('uses cacheService.getOrSet with keyPrefix and ttl', async () => {
    const cacheService = {
      getOrSet: jest
        .fn()
        .mockImplementation(
          async (_k: string, factory: () => Promise<number>) => factory(),
        ),
    } as unknown as CacheService;

    class Demo {
      constructor(public cacheService: CacheService) {}

      @Cached({ ttlMs: 1000, keyPrefix: 'demo' })
      async compute(n: number) {
        return n + 1;
      }
    }

    const d = new Demo(cacheService);
    const result = await d.compute(2);

    expect(result).toBe(3);
    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      'demo:[2]',
      expect.any(Function),
      1000,
      undefined,
    );
  });

  it('passes dependencies to getOrSet when provided', async () => {
    const cacheService = {
      getOrSet: jest
        .fn()
        .mockImplementation(
          async (_k: string, factory: () => Promise<string>) => factory(),
        ),
    } as unknown as CacheService;

    class Demo {
      constructor(public cacheService: CacheService) {}

      @Cached({
        ttlMs: 500,
        keyPrefix: 'x',
        dependencies: ['property:p1'],
      })
      async load() {
        return 'ok';
      }
    }

    const d = new Demo(cacheService);
    await d.load();

    expect(cacheService.getOrSet).toHaveBeenCalledWith(
      'x:[]',
      expect.any(Function),
      500,
      { dependencies: ['property:p1'] },
    );
  });

  it('throws if cacheService is missing', async () => {
    class Bad {
      @Cached({ ttlMs: 100, keyPrefix: 'bad' })
      async run() {
        return 1;
      }
    }

    const b = new Bad();
    await expect(b.run()).rejects.toThrow(/cacheService/);
  });
});
