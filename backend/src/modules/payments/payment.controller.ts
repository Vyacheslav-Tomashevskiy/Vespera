import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Request,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import { RecordPaymentDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { PaymentFiltersDto } from './dto/payment-filters.dto';

@Controller('api/payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  async recordPayment(@Body() dto: RecordPaymentDto, @Request() req: { user?: { id: string } }) {
    return this.paymentService.recordPayment(dto, req.user?.id || '');
  }

  @Get()
  async listPayments(@Query() filters: PaymentFiltersDto) {
    return this.paymentService.listPayments(filters);
  }

  @Get(':id')
  async getPayment(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }

  @Post(':id/refund')
  async processRefund(
    @Param('id') id: string,
    @Body() dto: ProcessRefundDto,
    @Request() req: { user?: { id: string } },
  ) {
    return this.paymentService.processRefund(id, dto, req.user?.id || '');
  }

  @Get(':id/receipt')
  async generateReceipt(@Param('id') id: string): Promise<unknown> {
    return this.paymentService.generateReceipt(id);
  }
}

// Separate controller for agreement-specific endpoints
@Controller('api/agreements')
export class AgreementPaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get(':id/payments')
  async getPaymentsForAgreement(@Param('id') agreementId: string) {
    return this.paymentService.listPayments({ agreementId });
  }
}
