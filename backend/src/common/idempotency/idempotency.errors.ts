export class IdempotencyKeyMissingError extends Error {
  constructor(message = 'Idempotency key is required but was not provided') {
    super(message);
    this.name = 'IdempotencyKeyMissingError';
  }
}
