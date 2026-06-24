export { LockService, LockRetryOptions } from './lock.service';
export {
  LockNotAcquiredError,
  LockBackendUnavailableError,
} from './lock.errors';
export { Locked, LockedOptions } from './locked.decorator';
export { LockModule } from './lock.module';
export { REDIS_CLIENT } from './redis-client.token';
export {
  IN_MEMORY_FALLBACK_ENV,
  isInMemoryFallbackAllowed,
} from './redis-fallback';
