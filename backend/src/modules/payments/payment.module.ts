import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentService } from './payment.service';
import {
  PaymentController,
  AgreementPaymentController,
} from './payment.controller';
import { PaymentGatewayService } from './payment-gateway.service';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, PaymentMethod])],
  controllers: [PaymentController, AgreementPaymentController],
  providers: [PaymentService, PaymentGatewayService],
  exports: [PaymentService, PaymentGatewayService],
})
export class PaymentModule {}
