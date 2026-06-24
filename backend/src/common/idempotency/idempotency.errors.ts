export class IdempotencyKeyMissingError extends Error {
  constructor(message = 'Idempotency key is required but was not provided') {
    super(message);
    this.name = 'IdempotencyKeyMissingError';
  }
}

export class IdempotencyInProgressError extends Error {
  constructor(key?: string) {
    super(
      key
        ? `Another request for idempotency key "${key}" is still in progress and did not complete within the wait window`
        : 'Another request for this idempotency key is still in progress and did not complete within the wait window',
    );
    this.name = 'IdempotencyInProgressError';
  }
}
