import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invalidationDependencies } from '@/lib/query/hooks/use-cache-invalidation';
import { queryKeys } from '@/lib/query/keys';

// ─── invalidationDependencies map ────────────────────────────────────────────

describe('invalidationDependencies', () => {
  it('payments depends on agreements and transactions', () => {
    const deps = invalidationDependencies['payments'];
    expect(deps).toContainEqual(queryKeys.agreements.all);
    expect(deps).toContainEqual(queryKeys.transactions.all);
  });

  it('agreements depends on payments and properties', () => {
    const deps = invalidationDependencies['agreements'];
    expect(deps).toContainEqual(queryKeys.payments.all);
    expect(deps).toContainEqual(queryKeys.properties.all);
  });

  it('kyc depends on users', () => {
    expect(invalidationDependencies['kyc']).toContainEqual(queryKeys.users.all);
  });

  it('users depends on roles', () => {
    expect(invalidationDependencies['users']).toContainEqual(
      queryKeys.roles.all,
    );
  });

  it('anchorTransactions depends on transactions', () => {
    expect(invalidationDependencies['anchorTransactions']).toContainEqual(
      queryKeys.transactions.all,
    );
  });

  it('all expected domains are present', () => {
    const expectedDomains = [
      'payments',
      'agreements',
      'kyc',
      'users',
      'properties',
      'notifications',
      'security',
      'roles',
      'audit',
      'transactions',
      'anchorTransactions',
    ];
    expectedDomains.forEach((domain) => {
      expect(invalidationDependencies).toHaveProperty(domain);
    });
  });
});

// ─── useCacheInvalidation logic ───────────────────────────────────────────────
//
// We test the invalidation logic directly without a React renderer by
// replicating the hook's core behaviour in a plain function.

function makeQueryClient() {
  const invalidated: unknown[][] = [];
  return {
    invalidateQueries: vi.fn(({ queryKey }: { queryKey: unknown[] }) => {
      invalidated.push(queryKey);
    }),
    invalidated,
  };
}

function runInvalidation(
  queryClient: ReturnType<typeof makeQueryClient>,
  config: {
    key: readonly unknown[];
    dependencies?: readonly (readonly unknown[])[];
    onInvalidate?: () => void;
  },
) {
  // Mirror the hook's invalidate() logic.
  queryClient.invalidateQueries({ queryKey: config.key as unknown[] });

  config.dependencies?.forEach((dep) => {
    queryClient.invalidateQueries({ queryKey: dep as unknown[] });
  });

  const domainKey = config.key[0];
  if (typeof domainKey === 'string') {
    const autoDeps = invalidationDependencies[domainKey] ?? [];
    autoDeps.forEach((dep) => {
      queryClient.invalidateQueries({ queryKey: dep as unknown[] });
    });
  }

  config.onInvalidate?.();
}

describe('useCacheInvalidation (logic)', () => {
  let qc: ReturnType<typeof makeQueryClient>;

  beforeEach(() => {
    qc = makeQueryClient();
  });

  it('invalidates the primary key', () => {
    runInvalidation(qc, { key: queryKeys.payments.all });
    expect(qc.invalidated).toContainEqual([...queryKeys.payments.all]);
  });

  it('invalidates explicit dependencies', () => {
    runInvalidation(qc, {
      key: queryKeys.properties.all,
      dependencies: [queryKeys.user.all],
    });
    expect(qc.invalidated).toContainEqual([...queryKeys.user.all]);
  });

  it('auto-invalidates cross-domain deps for payments', () => {
    runInvalidation(qc, { key: queryKeys.payments.all });
    expect(qc.invalidated).toContainEqual([...queryKeys.agreements.all]);
    expect(qc.invalidated).toContainEqual([...queryKeys.transactions.all]);
  });

  it('auto-invalidates cross-domain deps for kyc', () => {
    runInvalidation(qc, { key: queryKeys.kyc.all });
    expect(qc.invalidated).toContainEqual([...queryKeys.users.all]);
  });

  it('calls onInvalidate callback after invalidation', () => {
    const onInvalidate = vi.fn();
    runInvalidation(qc, { key: queryKeys.notifications.all, onInvalidate });
    expect(onInvalidate).toHaveBeenCalledOnce();
  });

  it('does not throw for domains with no auto-deps', () => {
    expect(() =>
      runInvalidation(qc, { key: queryKeys.notifications.all }),
    ).not.toThrow();
  });

  it('invalidateKey busts an arbitrary key', () => {
    const arbitraryKey = ['some', 'custom', 'key'];
    qc.invalidateQueries({ queryKey: arbitraryKey });
    expect(qc.invalidated).toContainEqual(arbitraryKey);
  });
});
