# Cache Troubleshooting Guide

## Stale Data Issues

### Symptoms

- Users see old values after updates
- Different endpoints return inconsistent snapshots

### Checks

- Confirm write paths call `invalidate` or `invalidatePropertyDomainCaches`
- Validate cache key naming consistency
- Verify TTL is not too long for mutable entities

### Fixes

- Add event-based invalidation on mutation methods
- Add dependency tags for aggregate reads
- Lower TTL for frequently changing resources

## High Cache Miss Rate

### Symptoms

- `missRate` keeps increasing
- Latency regresses to DB-bound response times

### Checks

- Compare key generation between read/write paths
- Confirm keys include stable canonicalized query params
- Verify warming jobs are running (if configured)

### Fixes

- Normalize query serialization
- Increase TTL for expensive stable reads
- Introduce cache warming for hot paths

## Invalidation Failures

### Symptoms

- Mutation succeeds but stale reads continue
- Logs show invalidate call errors

### Checks

- Redis connectivity and auth
- Pattern used in `invalidate()` matches actual key prefix
- Dependency tag registration on `set()`

### Fixes

- Retry invalidation in background queue
- Add structured logging with entity id/key pattern
- Use cascade invalidation where one entity affects many views

## Performance / Memory Pressure

### Symptoms

- Redis memory grows rapidly
- Evictions spike and hit rate drops

### Checks

- Inspect number of unique list/search keys
- Check for unbounded key cardinality from raw query strings
- Review TTLs for long-lived high-cardinality keys

### Fixes

- Hash normalized query objects for list/search keys
- Reduce TTL for high-cardinality caches
- Add key cardinality guards in key builders

## Operational Runbook

1. Capture `GET /api/cache/stats` snapshot.
2. Identify affected domain (`property`, `search`, `user`, etc.).
3. Run targeted invalidation first.
4. If unresolved, run domain cascade invalidation.
5. Use full `invalidateAll()` only as last resort.
6. Record root cause and add preventive test/documentation.
