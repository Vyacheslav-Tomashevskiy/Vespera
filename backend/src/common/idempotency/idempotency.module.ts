import { Global, Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { LockModule } from '../lock';

@Global()
@Module({
  imports: [LockModule],
  providers: [IdempotencyService],
  exports: [IdempotencyService],
})
export class IdempotencyModule {}
