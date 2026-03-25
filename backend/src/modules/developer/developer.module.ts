import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ApiKey } from './entities/api-key.entity';
import { ApiKeyRotationHistory } from './entities/api-key-rotation-history.entity';
import { DeveloperController } from './developer.controller';
import { DeveloperPortalController } from './developer-portal.controller';
import { DeveloperService } from './developer.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey, ApiKeyRotationHistory])],
  controllers: [DeveloperController, DeveloperPortalController],
  providers: [DeveloperService],
  exports: [DeveloperService],
})
export class DeveloperModule {}
