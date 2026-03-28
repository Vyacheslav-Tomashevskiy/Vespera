import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SubletRequest } from './entities/sublet-request.entity';
import { SubletBooking } from './entities/sublet-booking.entity';
import { SublettingService } from './subletting.service';
import { SublettingController } from './subletting.controller';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { Property } from '../properties/entities/property.entity';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SubletRequest,
      SubletBooking,
      RentAgreement,
      Property,
    ]),
    NotificationsModule,
  ],
  providers: [SublettingService],
  controllers: [SublettingController],
  exports: [SublettingService],
})
export class SublettingModule {}
