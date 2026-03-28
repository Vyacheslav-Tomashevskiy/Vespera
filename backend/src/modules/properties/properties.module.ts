import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';

import { PropertiesController } from './properties.controller';
import { PropertyWizardController } from './property-wizard.controller';

import { PropertiesService } from './properties.service';
import { PropertyWizardService } from './property-wizard.service';
import { PropertyCacheWarmingService } from './property-cache-warming.service';

import { CacheService } from '../../common/cache/cache.service';

import { Property } from './entities/property.entity';
import { PropertyImage } from './entities/property-image.entity';
import { PropertyAmenity } from './entities/property-amenity.entity';
import { RentalUnit } from './entities/rental-unit.entity';
import { PropertyListingDraft } from './entities/property-listing-draft.entity';

@Module({
  imports: [
    ScheduleModule,
    TypeOrmModule.forFeature([
      Property,
      PropertyImage,
      PropertyAmenity,
      RentalUnit,
      PropertyListingDraft,
    ]),
  ],
  controllers: [
    PropertiesController,
    PropertyWizardController,
  ],
  providers: [
    PropertiesService,
    PropertyWizardService,
    PropertyCacheWarmingService,
    CacheService,
  ],
  exports: [
    PropertiesService,
    PropertyWizardService,
  ],
})
export class PropertiesModule {}
