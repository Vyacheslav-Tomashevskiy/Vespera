import { CacheService } from './cache.service';
import { GetOrSetOptions } from './cache.types';

export interface CachedOptions {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Prefix for the cache key (e.g. `user:profile`) */
  keyPrefix: string;
  /** Optional deterministic key from arguments (defaults to JSON.stringify(args)) */
  keyFn?: (...args: unknown[]) => string;
  /** Tags for dependency-based invalidation (e.g. `property:uuid`, `user:uuid`) */
  dependencies?: string[];
}

/**
 * Method decorator for cache-aside loading. The host class **must** inject
 * {@link CacheService} as a property named `cacheService`.
 */
export function Cached(options: CachedOptions): MethodDecorator {
  return (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value as (
      ...args: unknown[]
    ) => Promise<unknown>;

    descriptor.value = async function (
      this: { cacheService?: CacheService },
      ...args: unknown[]
    ) {
      const cache = this.cacheService;
      if (!cache) {
        throw new Error(
          `@Cached() on ${String(propertyKey)} requires CacheService injected as "cacheService"`,
        );
      }

      const keyPart = options.keyFn
        ? options.keyFn(...args)
        : JSON.stringify(args);
      const key = `${options.keyPrefix}:${keyPart}`;

      const getOrSetOpts: GetOrSetOptions | undefined = options.dependencies
        ?.length
        ? { dependencies: options.dependencies }
        : undefined;

      return cache.getOrSet(
        key,
        () => original.apply(this, args),
        options.ttlMs,
        getOrSetOpts,
      );
    };

    return descriptor;
  };
}
