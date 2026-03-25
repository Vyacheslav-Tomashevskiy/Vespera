import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Repository } from 'typeorm';
import { Property, ListingStatus } from './entities/property.entity';
import { CacheService } from '../../common/cache/cache.service';
import {
  CACHE_PREFIX_PROPERTY,
  TTL_PROPERTY_ENTRY_MS,
} from '../../common/cache/cache.constants';

/**
 * Pre-loads frequently accessed property payloads and refreshes them on a schedule.
 * Startup warming runs only when ENABLE_CACHE_WARMING=true (off by default in tests).
 */
@Injectable()
export class PropertyCacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(PropertyCacheWarmingService.name);

  constructor(
    @InjectRepository(Property)
    private readonly propertyRepository: Repository<Property>,
    private readonly cacheService: CacheService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    if (process.env.ENABLE_CACHE_WARMING === 'true') {
      await this.warmCache().catch((err) =>
        this.logger.warn(`Cache warm skipped: ${(err as Error).message}`),
      );
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_4AM)
  async scheduledWarmCache(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      return;
    }
    await this.warmCache().catch((err) =>
      this.logger.warn(
        `Scheduled cache warm failed: ${(err as Error).message}`,
      ),
    );
  }

  async warmCache(): Promise<void> {
    const properties = await this.propertyRepository.find({
      where: { status: ListingStatus.PUBLISHED },
      take: 500,
      relations: ['images', 'amenities', 'owner'],
    });

    for (const property of properties) {
      const key = `${CACHE_PREFIX_PROPERTY}:${property.id}`;
      await this.cacheService.set(key, property, TTL_PROPERTY_ENTRY_MS, [key]);
    }

    this.logger.log(
      `Warmed ${properties.length} published property cache entries`,
    );
  }
}
