'use client';

import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../keys';

// ─── Cross-domain dependency map ─────────────────────────────────────────────
//
// Defines which additional query key groups must be invalidated when a given
// domain is mutated. Keys are the "trigger" domain; values are arrays of
// query key arrays to also invalidate.
//
// Example: mutating a payment should also bust agreements and transactions
// because both surfaces display payment-derived data.

export const invalidationDependencies: Record<
  string,
  readonly (readonly unknown[])[]
> = {
  payments: [queryKeys.agreements.all, queryKeys.transactions.all],
  agreements: [queryKeys.payments.all, queryKeys.properties.all],
  kyc: [queryKeys.users.all],
  users: [queryKeys.roles.all],
  properties: [],
  notifications: [],
  security: [],
  roles: [],
  audit: [],
  transactions: [],
  anchorTransactions: [queryKeys.transactions.all],
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface CacheInvalidationConfig {
  /** Primary query key to invalidate (matches the `queryKeys` domain `all` key). */
  key: readonly unknown[];
  /** Extra keys to invalidate alongside the primary key. */
  dependencies?: readonly (readonly unknown[])[];
  /** Called after all invalidations are dispatched. */
  onInvalidate?: () => void;
}

export interface UseCacheInvalidationResult {
  /** Invalidate the configured key and all its dependencies. */
  invalidate: () => void;
  /** Invalidate an arbitrary key on demand (one-off use). */
  invalidateKey: (key: readonly unknown[]) => void;
}

/**
 * Consistent cache invalidation hook.
 *
 * Wraps `queryClient.invalidateQueries` with:
 * - Automatic cross-domain dependency invalidation via `invalidationDependencies`
 * - An optional `onInvalidate` callback
 * - A standalone `invalidateKey` escape hatch for ad-hoc invalidations
 *
 * Usage:
 * ```ts
 * const { invalidate } = useCacheInvalidation({
 *   key: queryKeys.payments.all,
 *   onInvalidate: () => toast.success('Refreshed'),
 * });
 * ```
 */
export function useCacheInvalidation(
  config: CacheInvalidationConfig,
): UseCacheInvalidationResult {
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    // Invalidate the primary key.
    queryClient.invalidateQueries({ queryKey: config.key });

    // Invalidate explicit dependencies passed in config.
    config.dependencies?.forEach((dep) => {
      queryClient.invalidateQueries({ queryKey: dep });
    });

    // Invalidate auto-resolved cross-domain dependencies.
    const domainKey = config.key[0];
    if (typeof domainKey === 'string') {
      const autoDeps = invalidationDependencies[domainKey] ?? [];
      autoDeps.forEach((dep) => {
        queryClient.invalidateQueries({ queryKey: dep });
      });
    }

    config.onInvalidate?.();
  }, [queryClient, config]);

  const invalidateKey = useCallback(
    (key: readonly unknown[]) => {
      queryClient.invalidateQueries({ queryKey: key });
    },
    [queryClient],
  );

  return { invalidate, invalidateKey };
}
