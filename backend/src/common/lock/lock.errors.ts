export class LockNotAcquiredError extends Error {
  constructor(message = 'Could not acquire lock within the retry window') {
    super(message);
    this.name = 'LockNotAcquiredError';
  }
}

/**
 * Thrown when a distributed lock is required but no Redis backend is available
 * and the in-memory fallback is not permitted. Locking fails closed so that
 * financial flows are rejected rather than running without cross-instance
 * mutual exclusion.
 */
export class LockBackendUnavailableError extends Error {
  constructor(
    message = 'Distributed lock backend (Redis) is unavailable and in-memory fallback is disabled — refusing to run without cross-instance mutual exclusion',
  ) {
    super(message);
    this.name = 'LockBackendUnavailableError';
  }
}
