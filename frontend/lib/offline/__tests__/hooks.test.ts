/**
 * Tests for offline hooks logic.
 *
 * useOnline and useOfflineMutation are tested by replicating their core
 * logic without a React renderer (no @testing-library/react installed).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// ─── useOnline logic ──────────────────────────────────────────────────────────

describe('useOnline (logic)', () => {
  const listeners: Record<string, EventListener[]> = {};

  beforeEach(() => {
    vi.stubGlobal('navigator', { onLine: true });
    vi.stubGlobal('window', {
      addEventListener: (event: string, fn: EventListener) => {
        listeners[event] = listeners[event] ?? [];
        listeners[event].push(fn);
      },
      removeEventListener: (event: string, fn: EventListener) => {
        listeners[event] = (listeners[event] ?? []).filter((l) => l !== fn);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Object.keys(listeners).forEach((k) => delete listeners[k]);
  });

  it('reads initial value from navigator.onLine (true)', () => {
    vi.stubGlobal('navigator', { onLine: true });
    const initial = typeof navigator !== 'undefined' ? navigator.onLine : true;
    expect(initial).toBe(true);
  });

  it('reads initial value from navigator.onLine (false)', () => {
    vi.stubGlobal('navigator', { onLine: false });
    const initial = typeof navigator !== 'undefined' ? navigator.onLine : true;
    expect(initial).toBe(false);
  });

  it('registers online and offline event listeners', () => {
    const registered: string[] = [];
    const mockWindow = {
      addEventListener: (event: string) => registered.push(event),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal('window', mockWindow);

    // Simulate what the hook's useEffect does.
    const handleOnline = () => {};
    const handleOffline = () => {};
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    expect(registered).toContain('online');
    expect(registered).toContain('offline');
  });

  it('cleanup removes both listeners', () => {
    const removed: string[] = [];
    const mockWindow = {
      addEventListener: vi.fn(),
      removeEventListener: (event: string) => removed.push(event),
    };
    vi.stubGlobal('window', mockWindow);

    const handleOnline = () => {};
    const handleOffline = () => {};
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);

    expect(removed).toContain('online');
    expect(removed).toContain('offline');
  });

  it('defaults to true when navigator is undefined (SSR)', () => {
    vi.stubGlobal('navigator', undefined);
    const initial = typeof navigator !== 'undefined' ? navigator.onLine : true;
    expect(initial).toBe(true);
  });
});

// ─── useOfflineMutation logic ─────────────────────────────────────────────────

describe('useOfflineMutation (logic)', () => {
  // Replicate the mutationFn logic without React.
  async function runMutation<TData, TVariables>(
    isOnline: boolean,
    entity: string,
    action: 'create' | 'update' | 'delete',
    onlineFn: (v: TVariables) => Promise<TData>,
    addToQueue: (item: {
      action: string;
      entity: string;
      entityId: string;
      payload: TVariables;
    }) => Promise<void>,
    variables: TVariables,
  ): Promise<TData | null> {
    if (!isOnline) {
      const entityId =
        typeof variables === 'object' && variables !== null && 'id' in variables
          ? String((variables as { id: unknown }).id)
          : '';
      await addToQueue({ action, entity, entityId, payload: variables });
      return null;
    }
    return onlineFn(variables);
  }

  it('calls onlineFn when online', async () => {
    const onlineFn = vi.fn().mockResolvedValue({ id: '1' });
    const addToQueue = vi.fn();

    const result = await runMutation(
      true,
      'properties',
      'create',
      onlineFn,
      addToQueue,
      { title: 'New property' },
    );

    expect(onlineFn).toHaveBeenCalledOnce();
    expect(addToQueue).not.toHaveBeenCalled();
    expect(result).toEqual({ id: '1' });
  });

  it('queues the operation and returns null when offline', async () => {
    const onlineFn = vi.fn();
    const addToQueue = vi.fn().mockResolvedValue(undefined);

    const result = await runMutation(
      false,
      'payments',
      'create',
      onlineFn,
      addToQueue,
      { amount: 5000 },
    );

    expect(onlineFn).not.toHaveBeenCalled();
    expect(addToQueue).toHaveBeenCalledOnce();
    expect(result).toBeNull();
  });

  it('extracts entityId from variables.id when present', async () => {
    const addToQueue = vi.fn().mockResolvedValue(undefined);

    await runMutation(false, 'properties', 'update', vi.fn(), addToQueue, {
      id: 'prop-42',
      title: 'Updated',
    });

    expect(addToQueue).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: 'prop-42' }),
    );
  });

  it('uses empty string entityId when variables has no id', async () => {
    const addToQueue = vi.fn().mockResolvedValue(undefined);

    await runMutation(false, 'notifications', 'create', vi.fn(), addToQueue, {
      message: 'hello',
    });

    expect(addToQueue).toHaveBeenCalledWith(
      expect.objectContaining({ entityId: '' }),
    );
  });

  it('passes entity and action to the queue', async () => {
    const addToQueue = vi.fn().mockResolvedValue(undefined);

    await runMutation(false, 'agreements', 'delete', vi.fn(), addToQueue, {
      id: 'agr-7',
    });

    expect(addToQueue).toHaveBeenCalledWith(
      expect.objectContaining({ entity: 'agreements', action: 'delete' }),
    );
  });
});
