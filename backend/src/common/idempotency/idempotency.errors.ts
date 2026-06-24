export class IdempotencyKeyMissingError extends Error {
  constructor(message = 'Idempotency key is required but was not provided') {
    super(message);
    this.name = 'IdempotencyKeyMissingError';
  }
}

/**
 * Thrown when idempotency is required but no Redis backend is available and the
 * in-memory fallback is not permitted. The store fails closed so that operations
 * are rejected rather than running with idempotency that holds only within a
 * single process.
 */
export class IdempotencyBackendUnavailableError extends Error {
  constructor(
    message = 'Idempotency backend (Redis) is unavailable and in-memory fallback is disabled — refusing to run without cross-instance single-execution guarantees',
  ) {
    super(message);
    this.name = 'IdempotencyBackendUnavailableError';
  }
}
