/**
 * Shared policy for the in-process fallback used by {@link LockService} and
 * {@link IdempotencyService} when no Redis client is available.
 *
 * Guarantees by mode:
 * - **Redis present** — full distributed guarantees: cross-instance mutual
 *   exclusion (locks) and single-execution (idempotency) across every process
 *   and instance that shares the same Redis.
 * - **Redis absent + fallback DISABLED** (the default outside tests) — *fail
 *   closed*: protected operations are rejected instead of silently running with
 *   no cross-instance safety. This is the safe default for multi-instance /
 *   serverless deployments where a missing Redis would otherwise enable
 *   double-spend / double-charge.
 * - **Redis absent + fallback ENABLED** — *degraded single-process mode*:
 *   mutual exclusion / idempotency hold ONLY within one process. Multiple
 *   instances each keep their own in-memory map and get NO cross-instance
 *   protection. Intended for local development or a deliberately single-instance
 *   deployment, never for horizontally-scaled financial flows.
 *
 * The degraded fallback is opt-in via `ALLOW_IN_MEMORY_LOCK_FALLBACK=true`, and
 * is always enabled under `NODE_ENV=test` so unit tests can exercise the
 * in-memory path without extra wiring.
 */
export const IN_MEMORY_FALLBACK_ENV = 'ALLOW_IN_MEMORY_LOCK_FALLBACK';

export function isInMemoryFallbackAllowed(): boolean {
  if (process.env.NODE_ENV === 'test') {
    return true;
  }
  return process.env[IN_MEMORY_FALLBACK_ENV] === 'true';
}
