# Application cache layer

Centralizes caching, invalidation, TTLs, and observability on top of Nest’s global `CacheModule` (`cache-manager`).

## `CacheService`

- **`get` / `set`** – thin wrappers with hit/miss/set counters.
- **`getOrSet`** – cache-aside with TTL (milliseconds) and optional **dependency tags**; concurrent requests for the same key share one in-flight load to reduce stampedes.
- **`invalidate(pattern)`** – deletes keys when the backing store exposes `store.keys(pattern)` (supports `*`), and clears entries registered under matching **dependency tags**.
- **`invalidatePropertyDomainCaches(propertyId?)`** – invalidates public listing caches, search, suggestions, and a warmed `property:{id}` entry when an id is provided. Call this after create/update/delete/publish/archive/rent on properties.
- **`invalidateAll`** – clears all known app namespaces (`properties:list:*`, `search:properties:*`, `suggest:*`, `property:*`). Does **not** flush the entire Redis database (rate limits and other keys stay).
- **`getStats` / `resetStats`** – hit/miss rates, sets, evictions, and count of dependency-tracked keys. Exposed at **`GET /api/cache/stats`** (see `MonitoringController`).

## `@Cached` decorator

Use on async methods whose class injects **`cacheService: CacheService`**:

```typescript
@Cached({
  ttlMs: 3_600_000,
  keyPrefix: 'user:props',
  keyFn: (userId: string) => userId,
  dependencies: ['user:uuid', 'property:*'],
})
async getUserProperties(userId: string) { ... }
```

Dependency tags are used with `invalidate('property:123')` or `invalidate('property:*')`.

## TTL constants

See `cache.constants.ts` (`TTL_PUBLIC_PROPERTY_LIST_MS`, `TTL_SEARCH_RESULTS_MS`, etc.).

## Cache warming

`PropertyCacheWarmingService` loads published properties into `property:{id}` entries on a daily cron. **Startup** warming runs only when `ENABLE_CACHE_WARMING=true` (disabled in tests).

## Environment

| Variable                 | Purpose                                      |
| ------------------------ | -------------------------------------------- |
| `ENABLE_CACHE_WARMING`   | If `true`, warm property keys on app startup |
