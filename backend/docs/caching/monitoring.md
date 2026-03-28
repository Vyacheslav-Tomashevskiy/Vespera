# Cache Monitoring Guide

## Core Metrics

Use `CacheService.getStats()` (or `/api/cache/stats`) to track:

- `hits`: successful cache lookups
- `misses`: lookup fallback to source of truth
- `sets`: cache population count
- `evictions`: invalidations/expired removals observed
- `hitRate`: `hits / (hits + misses)`
- `missRate`: `misses / (hits + misses)`
- `dependencyTrackedKeys`: keys tracked via dependency tags

## SLO-Oriented Targets

| Metric            | Target  | Warning       |
| ----------------- | ------- | ------------- |
| Hit rate          | >= 0.80 | < 0.60        |
| Miss rate         | <= 0.20 | > 0.40        |
| P95 cache latency | < 10 ms | > 25 ms       |
| Eviction growth   | Stable  | Sudden spikes |

## Dashboard Panels

1. Hit rate / miss rate over time.
2. Read latency by endpoint (`properties`, `search`, `suggest`).
3. Key cardinality trends by prefix.
4. Evictions and invalidation volume.
5. Redis memory utilization and connection health.

## Alert Rules

- Alert when `hitRate < 0.60` for 10 minutes.
- Alert when evictions increase > 3x baseline for 15 minutes.
- Alert when Redis latency exceeds threshold or connectivity drops.

## Incident Triage

1. Check `cache/stats` snapshot and endpoint-level latency.
2. Identify affected key space (`property:*`, `search:*`, etc.).
3. Verify recent deploy changed invalidation or key generation logic.
4. Run targeted invalidation for affected domain.
5. If stale data persists, run cascade invalidation and monitor recovery.
6. Add regression test for failed invalidation path.

## Capacity Planning

- Track top prefixes by key count and memory.
- Keep list/search cache TTLs short to bound key growth.
- Hash normalized query objects to avoid unbounded key cardinality.
- Review cache warming schedule against traffic patterns.
