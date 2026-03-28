# Caching Architecture Overview

This directory documents the caching strategy used in the Chioma backend. The application uses a two-tier cache:

- **In-memory cache** — used in the test environment (`NODE_ENV=test`) via `@nestjs/cache-manager` with a simple in-process store.
- **Redis cache** — used in all other environments, backed by either ioredis (traditional Redis) or the Upstash REST API (serverless/Render deployments).

## Core Abstractions

### CacheService

Located at `backend/src/common/cache/cache.service.ts`.

Provides the following operations:

| Method                                        | Description                                             |
| --------------------------------------------- | ------------------------------------------------------- |
| `get<T>(key)`                                 | Retrieve a cached value by key                          |
| `set<T>(key, value, ttlMs?, deps?)`           | Store a value with optional TTL and dependency tags     |
| `getOrSet<T>(key, factory, ttlMs?, opts?)`    | Cache-aside with single-flight deduplication            |
| `invalidate(pattern)`                         | Delete keys matching a glob pattern or dependency tag   |
| `invalidateAll()`                             | Clear all application-namespaced property/search caches |
| `invalidatePropertyDomainCaches(propertyId?)` | Invalidate all property-related caches                  |
| `getStats()`                                  | Return hit/miss/eviction counters and hit rate          |

### @Cached Decorator

Located at `backend/src/common/cache/cached.decorator.ts`.

Wraps a method with cache-aside logic. The host class must inject `CacheService` as `this.cacheService`.

```typescript
@Cached({ ttl: 3_600_000, dependencies: ['property:*'] })
async getProperty(id: string): Promise<Property> {
  return this.propertyRepository.findOne({ where: { id } });
}
```

## Documents in This Directory

| File                                       | Contents                                                                           |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| [strategy.md](./strategy.md)               | Key naming conventions, TTL guidelines, invalidation patterns overview, monitoring |
| [invalidation.md](./invalidation.md)       | Detailed description of all five invalidation patterns                             |
| [examples.md](./examples.md)               | Working TypeScript code examples                                                   |
| [troubleshooting.md](./troubleshooting.md) | Stale data, stampede, key collision, memory pressure                               |
| [monitoring.md](./monitoring.md)           | Metrics definitions, thresholds, dashboards, and alerting playbook                 |
