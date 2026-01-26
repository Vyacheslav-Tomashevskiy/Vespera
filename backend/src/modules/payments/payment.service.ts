import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment } from './entities/payment.entity';
import { PaymentMethod } from './entities/payment-method.entity';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';
import { PaymentGatewayService } from './payment-gateway.service';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(PaymentMethod)
    private readonly paymentMethodRepository: Repository<PaymentMethod>,
    private readonly paymentGateway: PaymentGatewayService,
  ) {}

  async recordPayment(dto: RecordPaymentDto, userId: string): Promise<Payment> {
    // Validate payment method exists and belongs to user
    const paymentMethod = await this.paymentMethodRepository.findOne({
      where: { id: parseInt(dto.paymentMethodId), userId },
    });
    if (!paymentMethod) {
      throw new NotFoundException('Payment method not found');
    }

    // Calculate fees (mock: 2% fee)
    const feeAmount = dto.amount * 0.02;
    const netAmount = dto.amount - feeAmount;

    // Process payment through gateway
    const chargeResult = this.paymentGateway.chargePayment(
      dto.paymentMethodId,
      dto.amount,
      'NGN',
    );

    if (!chargeResult.success) {
      throw new BadRequestException('Payment processing failed');
    }

    // Create payment record
    const payment = this.paymentRepository.create({
      userId,
      agreementId: dto.agreementId,
      amount: dto.amount,
      feeAmount,
      netAmount,
      currency: 'NGN',
      status: 'completed',
      paymentMethodId: paymentMethod.id,
      referenceNumber: dto.referenceNumber || chargeResult.chargeId,
      processedAt: new Date(),
      metadata: { chargeId: chargeResult.chargeId },
      notes: dto.notes,
    });

    const savedPayment = await this.paymentRepository.save(payment);
    this.logger.log(`Payment recorded: ${savedPayment.id}`);

    return savedPayment;
  }

  async processRefund(
    paymentId: string,
    dto: ProcessRefundDto,
    userId: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId, userId },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    if (dto.amount > payment.amount - payment.refundedAmount) {
      throw new BadRequestException('Refund amount exceeds available amount');
    }

    // Process refund through gateway
    const chargeId = (payment.metadata as { chargeId?: string })?.chargeId;
    if (!chargeId) {
      throw new BadRequestException('No charge ID found for refund');
    }
    const refundResult = this.paymentGateway.processRefund(
      chargeId,
      dto.amount,
    );

    if (!refundResult.success) {
      throw new BadRequestException('Refund processing failed');
    }

    // Update payment
    payment.refundedAmount += dto.amount;
    payment.refundReason = dto.reason;
    payment.status =
      payment.refundedAmount >= payment.amount ? 'refunded' : 'partial_refund';
    payment.metadata = { ...payment.metadata, refundId: refundResult.refundId } as any;

    const updatedPayment = await this.paymentRepository.save(payment);
    this.logger.log(`Refund processed for payment: ${paymentId}`);

    return updatedPayment;
  }

  async generateReceipt(paymentId: string): Promise<any> {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['user', 'paymentMethod'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // TODO: Generate PDF receipt
    // For now, return receipt data
    return {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      processedAt: payment.processedAt,
      user: {
        id: payment.user.id,
        email: payment.user.email,
      },
      paymentMethod: payment.paymentMethod
        ? {
            type: payment.paymentMethod.paymentType,
            lastFour: payment.paymentMethod.lastFour,
          }
        : null,
    };
  }

  async listPayments(filters: PaymentFiltersDto): Promise<Payment[]> {
    const query = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.user', 'user')
      .leftJoinAndSelect('payment.paymentMethod', 'paymentMethod');

    if (filters.userId) {
      query.andWhere('payment.userId = :userId', { userId: filters.userId });
    }

    if (filters.agreementId) {
      query.andWhere('payment.agreementId = :agreementId', {
        agreementId: filters.agreementId,
      });
    }

    if (filters.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }

    if (filters.startDate) {
      query.andWhere('payment.createdAt >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      query.andWhere('payment.createdAt <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.paymentMethodId) {
      query.andWhere('payment.paymentMethodId = :paymentMethodId', {
        paymentMethodId: parseInt(filters.paymentMethodId),
      });
    }

    query.orderBy('payment.createdAt', 'DESC');

    return query.getMany();
  }

  async getPaymentById(id: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['user', 'paymentMethod'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return payment;
  }
}
