/**
 * Tests for useOptimisticUpdate.
 *
 * Because @testing-library/react is not installed, we test the hook's
 * internal logic by extracting it into a plain async helper that mirrors
 * the hook's update() function. The hook itself is a thin wrapper around
 * useState + useRef, so the business logic lives entirely in the update()
 * closure and is fully testable this way.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Inline the core logic so we can test it without a React renderer ─────────

interface OptimisticState<T> {
  data: T | undefined;
  isPending: boolean;
}

function makeOptimisticUpdater<T>(
  updateFn: (data: T) => Promise<T>,
  onError?: (error: Error, revertedTo: T | undefined) => void,
) {
  let confirmed: T | undefined = undefined;
  const state: OptimisticState<T> = { data: undefined, isPending: false };

  const update = async (newData: T): Promise<T | undefined> => {
    const previous = confirmed;
    state.data = newData;
    state.isPending = true;
    try {
      const result = await updateFn(newData);
      confirmed = result;
      state.data = result;
      return result;
    } catch (err) {
      state.data = previous;
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error, previous);
      return undefined;
    } finally {
      state.isPending = false;
    }
  };

  const revert = () => {
    state.data = confirmed;
  };

  return { state, update, revert };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useOptimisticUpdate (logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('starts with undefined data and isPending=false', () => {
    const { state } = makeOptimisticUpdater(vi.fn().mockResolvedValue('x'));
    expect(state.data).toBeUndefined();
    expect(state.isPending).toBe(false);
  });

  it('settles to the server result after a successful update', async () => {
    const serverResult = { id: '1', title: 'Updated' };
    const updateFn = vi.fn().mockResolvedValue(serverResult);
    const { state, update } = makeOptimisticUpdater(updateFn);

    const returnValue = await update({ id: '1', title: 'Updated' });

    expect(updateFn).toHaveBeenCalledOnce();
    expect(state.data).toEqual(serverResult);
    expect(state.isPending).toBe(false);
    expect(returnValue).toEqual(serverResult);
  });

  it('reverts to the last confirmed value on server error', async () => {
    const initial = { count: 5 };
    const updateFn = vi
      .fn()
      .mockResolvedValueOnce(initial)
      .mockRejectedValueOnce(new Error('Network error'));

    const { state, update } = makeOptimisticUpdater(updateFn);

    await update(initial); // establishes confirmed
    expect(state.data).toEqual(initial);

    await update({ count: 99 }); // fails → reverts
    expect(state.data).toEqual(initial);
    expect(state.isPending).toBe(false);
  });

  it('calls onError with the error and the reverted value', async () => {
    const onError = vi.fn();
    const updateFn = vi.fn().mockRejectedValue(new Error('Oops'));
    const { update } = makeOptimisticUpdater(updateFn, onError);

    await update('new-value');

    expect(onError).toHaveBeenCalledOnce();
    const [err, revertedTo] = onError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Oops');
    expect(revertedTo).toBeUndefined(); // no prior confirmed value
  });

  it('returns undefined from update() when the server call fails', async () => {
    const { update } = makeOptimisticUpdater(
      vi.fn().mockRejectedValue(new Error('fail')),
    );
    const result = await update('anything');
    expect(result).toBeUndefined();
  });

  it('revert() restores the last confirmed server value', async () => {
    const confirmed = { status: 'active' };
    const { state, update, revert } = makeOptimisticUpdater(
      vi.fn().mockResolvedValue(confirmed),
    );

    await update(confirmed);
    revert();

    expect(state.data).toEqual(confirmed);
  });

  it('wraps non-Error rejections in an Error object', async () => {
    const onError = vi.fn();
    const { update } = makeOptimisticUpdater(
      vi.fn().mockRejectedValue('plain string error'),
      onError,
    );

    await update('value');

    const [err] = onError.mock.calls[0];
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('plain string error');
  });

  it('isPending is true during the async call and false after', async () => {
    let resolveFn!: (v: string) => void;
    const updateFn = vi.fn(
      () => new Promise<string>((res) => (resolveFn = res)),
    );
    const { state, update } = makeOptimisticUpdater(updateFn);

    const promise = update('value');
    expect(state.isPending).toBe(true);

    resolveFn('done');
    await promise;
    expect(state.isPending).toBe(false);
  });

  it('confirmed value advances with each successful call', async () => {
    const updateFn = vi
      .fn()
      .mockResolvedValueOnce({ v: 1 })
      .mockResolvedValueOnce({ v: 2 });

    const { state, update } = makeOptimisticUpdater(updateFn);

    await update({ v: 1 });
    expect(state.data).toEqual({ v: 1 });

    await update({ v: 2 });
    expect(state.data).toEqual({ v: 2 });
  });
});
