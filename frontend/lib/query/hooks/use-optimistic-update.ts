'use client';

import { useCallback, useRef, useState } from 'react';

export interface UseOptimisticUpdateOptions<T> {
  /** Called after a failed server update. Receives the error and the value that was reverted. */
  onError?: (error: Error, revertedTo: T | undefined) => void;
}

export interface UseOptimisticUpdateResult<T> {
  /** Current (possibly optimistic) value. */
  data: T | undefined;
  /** True while the server call is in-flight. */
  isPending: boolean;
  /** Apply an optimistic value, call the server, and revert on failure. */
  update: (newData: T) => Promise<T | undefined>;
  /** Manually revert to the last confirmed server value. */
  revert: () => void;
}

/**
 * Generic optimistic-update hook.
 *
 * Usage:
 * ```ts
 * const { data, isPending, update } = useOptimisticUpdate(
 *   (newValue) => api.patch('/resource', newValue),
 *   { onError: (err) => toast.error(err.message) },
 * );
 * ```
 */
export function useOptimisticUpdate<T>(
  updateFn: (data: T) => Promise<T>,
  options?: UseOptimisticUpdateOptions<T>,
): UseOptimisticUpdateResult<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [isPending, setIsPending] = useState(false);
  // Holds the last value confirmed by the server (or undefined before first call).
  const confirmedRef = useRef<T | undefined>(undefined);

  const update = useCallback(
    async (newData: T): Promise<T | undefined> => {
      // Snapshot current confirmed value for potential revert.
      const previous = confirmedRef.current;

      // Optimistically apply the new value immediately.
      setData(newData);
      setIsPending(true);

      try {
        const result = await updateFn(newData);
        confirmedRef.current = result;
        setData(result);
        return result;
      } catch (err) {
        // Revert to the last confirmed value.
        setData(previous);
        const error = err instanceof Error ? err : new Error(String(err));
        options?.onError?.(error, previous);
        return undefined;
      } finally {
        setIsPending(false);
      }
    },
    [updateFn, options],
  );

  const revert = useCallback(() => {
    setData(confirmedRef.current);
  }, []);

  return { data, isPending, update, revert };
}
