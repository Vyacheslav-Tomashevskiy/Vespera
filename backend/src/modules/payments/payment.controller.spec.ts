import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import {
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  PaymentController,
  PaymentMethodController,
  AgreementPaymentController,
  PaymentScheduleController,
  PaymentWebhookController,
} from './payment.controller';
import { PaymentService } from './payment.service';
import { AuditService } from '../audit/audit.service';
import { CreatePaymentRecordDto } from './dto/record-payment.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { CreatePaymentScheduleDto } from './dto/create-payment-schedule.dto';
import { PaymentInterval } from './entities/payment-schedule.entity';
import {
  CreateEscrowGatewayDto,
  PaymentGatewayWebhookDto,
  ProcessStellarRentGatewayDto,
} from './dto/payment-gateway.dto';
import { IS_PUBLIC_KEY } from '../auth/decorators/public.decorator';
import { WEBHOOK_SECRET_METADATA_KEY } from '../webhooks/decorators/webhook-secret.decorator';
import {
  WEBHOOK_SIGNATURE_HEADER,
  WEBHOOK_TIMESTAMP_HEADER,
  WebhookSignatureService,
} from '../webhooks/webhook-signature.service';
import { WebhookSignatureGuard } from '../webhooks/guards/webhook-signature.guard';
import { ROLES_KEY, RolesGuard } from '../auth/guards/roles.guard';
import { UserRole } from '../users/entities/user.entity';

const mockPaymentService = {
  recordPayment: jest.fn(),
  processStellarRentPayment: jest.fn(),
  createEscrowDeposit: jest.fn(),
  releaseEscrowDeposit: jest.fn(),
  refundEscrowDeposit: jest.fn(),
  reconcileStellarPayments: jest.fn(),
  retryFailedPayments: jest.fn(),
  handlePaymentGatewayWebhook: jest.fn(),
  getPaymentAnalytics: jest.fn(),
  listPayments: jest.fn(),
  getPaymentById: jest.fn(),
  processRefund: jest.fn(),
  generateReceipt: jest.fn(),
  createPaymentMethod: jest.fn(),
  listPaymentMethods: jest.fn(),
  updatePaymentMethod: jest.fn(),
  removePaymentMethod: jest.fn(),
  createPaymentSchedule: jest.fn(),
  listPaymentSchedules: jest.fn(),
  updatePaymentSchedule: jest.fn(),
  runPaymentSchedule: jest.fn(),
  processDueSchedules: jest.fn(),
};

describe('Payment Controllers', () => {
  let paymentController: PaymentController;
  let paymentMethodController: PaymentMethodController;
  let agreementPaymentController: AgreementPaymentController;
  let paymentScheduleController: PaymentScheduleController;
  let paymentWebhookController: PaymentWebhookController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [
        PaymentController,
        PaymentMethodController,
        AgreementPaymentController,
        PaymentScheduleController,
        PaymentWebhookController,
      ],
      providers: [
        {
          provide: PaymentService,
          useValue: mockPaymentService,
        },
        {
          provide: AuditService,
          useValue: {
            log: jest.fn(),
          },
        },
        {
          provide: Reflector,
          useValue: {
            get: jest.fn().mockReturnValue(undefined),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
        WebhookSignatureService,
      ],
    }).compile();

    paymentController = module.get<PaymentController>(PaymentController);
    paymentMethodController = module.get<PaymentMethodController>(
      PaymentMethodController,
    );
    agreementPaymentController = module.get<AgreementPaymentController>(
      AgreementPaymentController,
    );
    paymentScheduleController = module.get<PaymentScheduleController>(
      PaymentScheduleController,
    );
    paymentWebhookController = module.get<PaymentWebhookController>(
      PaymentWebhookController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('records payment with user id', async () => {
    const dto: CreatePaymentRecordDto = {
      agreementId: 'agreement_1',
      amount: 100,
      paymentMethodId: '1',
    };
    await paymentController.recordPayment(dto, { user: { id: 'user_1' } });
    expect(mockPaymentService.recordPayment).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('processes refund with user id', async () => {
    const dto: ProcessRefundDto = { amount: 50, reason: 'test' };
    await paymentController.processRefund('pay_1', dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.processRefund).toHaveBeenCalledWith(
      'pay_1',
      dto,
      'user_1',
    );
  });

  it('creates payment method with user id', async () => {
    const dto: CreatePaymentMethodDto = {
      paymentType: 'CREDIT_CARD',
      lastFour: '1234',
    };
    await paymentMethodController.createPaymentMethod(dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.createPaymentMethod).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('updates payment method with user id', async () => {
    const dto: UpdatePaymentMethodDto = { lastFour: '9876' };
    await paymentMethodController.updatePaymentMethod('1', dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.updatePaymentMethod).toHaveBeenCalledWith(
      1,
      dto,
      'user_1',
    );
  });

  it('lists agreement payments with user id', async () => {
    await agreementPaymentController.getPaymentsForAgreement('agreement_1', {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.listPayments).toHaveBeenCalledWith(
      { agreementId: 'agreement_1' },
      'user_1',
    );
  });

  it('creates payment schedule with user id', async () => {
    const dto: CreatePaymentScheduleDto = {
      agreementId: 'agreement_1',
      paymentMethodId: '1',
      amount: 200,
      interval: PaymentInterval.MONTHLY,
    };
    await paymentScheduleController.createSchedule(dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.createPaymentSchedule).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('runs payment schedule with user id', async () => {
    await paymentScheduleController.runSchedule('schedule_1', {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.runPaymentSchedule).toHaveBeenCalledWith(
      'schedule_1',
      'user_1',
    );
  });

  it('processes due schedules', async () => {
    await paymentScheduleController.processDueSchedules();
    expect(mockPaymentService.processDueSchedules).toHaveBeenCalled();
  });

  describe('process-due admin restriction', () => {
    function buildContext(user?: { role?: UserRole }) {
      return {
        getHandler: () => paymentScheduleController.processDueSchedules,
        getClass: () => PaymentScheduleController,
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
      } as unknown as ExecutionContext;
    }

    it('restricts process-due to the ADMIN role', () => {
      const reflector = new Reflector();

      expect(
        reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
          paymentScheduleController.processDueSchedules,
          PaymentScheduleController,
        ]),
      ).toEqual([UserRole.ADMIN]);
    });

    it('allows an administrator to invoke process-due', () => {
      const guard = new RolesGuard(new Reflector());

      expect(guard.canActivate(buildContext({ role: UserRole.ADMIN }))).toBe(
        true,
      );
    });

    it('forbids a standard authenticated user from invoking process-due', () => {
      const guard = new RolesGuard(new Reflector());

      expect(() =>
        guard.canActivate(buildContext({ role: UserRole.USER })),
      ).toThrow(ForbiddenException);
    });

    it('forbids an unauthenticated caller from invoking process-due', () => {
      const guard = new RolesGuard(new Reflector());

      expect(() => guard.canActivate(buildContext(undefined))).toThrow(
        ForbiddenException,
      );
    });
  });

  it('processes stellar rent payment with user id', async () => {
    const dto: ProcessStellarRentGatewayDto = {
      tenantAddress: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      tenantSecret: 'SSECRET',
      agreementId: 'agreement_1',
      amount: '12.5',
    };
    await paymentController.processStellarRent(dto, { user: { id: 'user_1' } });
    expect(mockPaymentService.processStellarRentPayment).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('creates stellar escrow deposit with user id', async () => {
    const dto: CreateEscrowGatewayDto = {
      sourcePublicKey:
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      destinationPublicKey:
        'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
      amount: '100',
      agreementId: 'agreement_2',
    };
    await paymentController.createEscrowDeposit(dto, {
      user: { id: 'user_1' },
    });
    expect(mockPaymentService.createEscrowDeposit).toHaveBeenCalledWith(
      dto,
      'user_1',
    );
  });

  it('handles payment gateway webhook', async () => {
    const dto: PaymentGatewayWebhookDto = {
      eventType: 'payment.completed',
      paymentId: 'pay_1',
      status: 'completed',
    };
    await paymentWebhookController.handleGatewayWebhook(dto);
    expect(mockPaymentService.handlePaymentGatewayWebhook).toHaveBeenCalledWith(
      dto,
    );
  });

  describe('payment gateway webhook signature guard', () => {
    const dto: PaymentGatewayWebhookDto = {
      eventType: 'payment.completed',
      paymentId: 'pay_1',
      status: 'completed',
    };
    const secret = 'payment-webhook-test-secret';

    function createGuardRequest(headers: Record<string, string> = {}) {
      const reflector = new Reflector();
      const signatureService = new WebhookSignatureService();
      const guard = new WebhookSignatureGuard(
        reflector,
        {
          get: jest.fn((key: string) =>
            key === 'PAYMENT_WEBHOOK_SECRET' ? secret : undefined,
          ),
        } as unknown as ConfigService,
        signatureService,
      );
      const context = {
        getHandler: () => paymentWebhookController.handleGatewayWebhook,
        getClass: () => PaymentWebhookController,
        switchToHttp: () => ({
          getRequest: () => ({
            body: dto,
            rawBody: JSON.stringify(dto),
            header: (name: string) => headers[name.toLowerCase()],
          }),
        }),
      } as unknown as ExecutionContext;

      return { guard, context, signatureService };
    }

    it('marks the payment gateway webhook as public', () => {
      const reflector = new Reflector();

      expect(
        reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
          paymentWebhookController.handleGatewayWebhook,
          PaymentWebhookController,
        ]),
      ).toBe(true);
    });

    it('uses the payment webhook secret configuration key', () => {
      const reflector = new Reflector();

      expect(
        reflector.getAllAndOverride<string>(WEBHOOK_SECRET_METADATA_KEY, [
          paymentWebhookController.handleGatewayWebhook,
          PaymentWebhookController,
        ]),
      ).toBe('PAYMENT_WEBHOOK_SECRET');
    });

    it('accepts a valid payment gateway webhook signature', () => {
      const timestamp = Date.now().toString();
      const { guard, signatureService } = createGuardRequest();
      const signature = signatureService.generateSignature(
        JSON.stringify(dto),
        timestamp,
        secret,
      );
      const signedContext = createGuardRequest({
        [WEBHOOK_SIGNATURE_HEADER]: signature,
        [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
      }).context;

      expect(guard.canActivate(signedContext)).toBe(true);
    });

    it('rejects an invalid payment gateway webhook signature', () => {
      const timestamp = Date.now().toString();
      const { guard, context } = createGuardRequest({
        [WEBHOOK_SIGNATURE_HEADER]: 'deadbeef',
        [WEBHOOK_TIMESTAMP_HEADER]: timestamp,
      });

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('rejects a missing payment gateway webhook signature', () => {
      const { guard, context } = createGuardRequest();

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
