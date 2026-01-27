import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AgreementsController } from './agreements.controller';
import { AgreementsService } from './agreements.service';
import { RentAgreement } from '../rent/entities/rent-contract.entity';
import { Payment } from '../rent/entities/payment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RentAgreement, Payment])],
  controllers: [AgreementsController],
  providers: [AgreementsService],
  exports: [AgreementsService],
})
export class AgreementsModule {}
