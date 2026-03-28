export class LockNotAcquiredError extends Error {
  constructor(message = 'Could not acquire lock within the retry window') {
    super(message);
    this.name = 'LockNotAcquiredError';
  }
}
