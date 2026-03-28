# Caching Strategy

## Cache Types in Use

| Type                       | When Used                                   | Provider                               |
| -------------------------- | ------------------------------------------- | -------------------------------------- |
| In-memory (NestJS default) | `NODE_ENV=test`                             | `@nestjs/cache-manager` built-in store |
| Redis via ioredis          | Production / staging with traditional Redis | `cache-manager-redis-yet` + ioredis    |
| Redis via Upstash REST     | Serverless / Render deployments             | Custom `UpstashCacheStore` adapter     |

The active store is selected at startup in `AppModule` based on environment variables:

- `REDIS_URL` + `REDIS_TOKEN` → Upstash REST API
- `REDIS_HOST` + `REDIS_PORT` → ioredis

## Key Naming Conventions

All cache keys are namespaced to avoid collisions. Use the constants in `cache.constants.ts`:

| Constant                              | Key Pattern                  | Example                    |
| ------------------------------------- | ---------------------------- | -------------------------- |
| `CACHE_PREFIX_PROPERTY`               | `property:{id}`              | `property:abc-123`         |
| `CACHE_PREFIX_PROPERTIES_LIST`        | `properties:list:{md5-hash}` | `properties:list:d41d8cd9` |
| `CACHE_PREFIX_SEARCH_PROPERTIES`      | `search:properties:{hash}`   | `search:properties:a1b2c3` |
| `CACHE_PREFIX_SUGGEST`                | `suggest:{hash}`             | `suggest:xyz`              |
| Lock keys (LockService)               | `lock:{resource}:{id}`       | `lock:payment:uuid-123`    |
| Idempotency keys (IdempotencyService) | `idempotency:{client-key}`   | `idempotency:uuid-abc`     |

**Rules:**

- Always use the exported constants — never hardcode key strings.
- Keys must be lowercase and use `:` as a separator.
- Include a unique identifier (UUID or hash) as the final segment for per-entity keys.

## TTL Guidelines

| Data Category            | TTL            | Constant                                   |
| ------------------------ | -------------- | ------------------------------------------ |
| Public property listings | 5 minutes      | `TTL_PUBLIC_PROPERTY_LIST_MS` (300,000 ms) |
| Search results           | 2 minutes      | `TTL_SEARCH_RESULTS_MS` (120,000 ms)       |
| Autocomplete suggestions | 5 minutes      | `TTL_SUGGEST_MS` (300,000 ms)              |
| Warmed property entries  | 1 hour         | `TTL_PROPERTY_ENTRY_MS` (3,600,000 ms)     |
| Idempotency — payments   | 24 hours       | 86,400,000 ms                              |
| Idempotency — agreements | 7 days         | 604,800,000 ms                             |
| Idempotency — disputes   | 30 days        | 2,592,000,000 ms                           |
| Distributed locks        | Max 30 seconds | 30,000 ms                                  |

**Guidelines:**

- Prefer shorter TTLs for data that changes frequently (search, listings).
- Use longer TTLs only for data that is expensive to compute and rarely changes.
- Never set TTL to 0 (no expiry) for application data — always set a reasonable upper bound.

## Invalidation Patterns Overview

Five patterns are used in this codebase (see [invalidation.md](./invalidation.md) for details):

1. **Time-based** — TTL expiry; no explicit invalidation needed.
2. **Event-based** — Call `CacheService.invalidate(key)` after a mutation.
3. **Dependency-based** — Register dependency tags on `set`; invalidate by tag.
4. **Manual** — Admin-triggered via `CacheService.invalidateAll()`.
5. **Cascade** — `invalidatePropertyDomainCaches(propertyId)` clears all related keys at once.

## Best Practices

- Always invalidate on mutations: after `save`, `update`, or `delete`, call the appropriate `invalidate*` method.
- Use `getOrSet` instead of `get` + `set` to avoid race conditions on cache population.
- Register dependency tags when a cached value depends on multiple entities.
- Do not cache sensitive data (passwords, tokens, PII) in Redis.
- Use `CacheService.getStats()` to monitor hit rates in development.

## Monitoring

The `GET /api/cache/stats` endpoint returns the output of `CacheService.getStats()`:

```json
{
  "hits": 1240,
  "misses": 88,
  "sets": 92,
  "evictions": 14,
  "hitRate": 0.934,
  "missRate": 0.066,
  "dependencyTrackedKeys": 47
}
```

**Thresholds:**

| Metric             | Healthy        | Investigate        |
| ------------------ | -------------- | ------------------ |
| `hitRate`          | ≥ 0.80         | < 0.60             |
| `missRate`         | ≤ 0.20         | > 0.40             |
| `evictions` (rate) | Low and stable | Rapidly increasing |

A hit rate below 0.60 usually indicates keys are expiring too quickly, cache warming is not running, or invalidation is too aggressive.
