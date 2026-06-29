import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { AnchorController } from '../controllers/anchor.controller';
import { AnchorService } from '../services/anchor.service';
import { WebhookSignatureService } from '../../webhooks/webhook-signature.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PaymentMethodType } from '../dto/deposit-request.dto';
import { AnchorTransactionStatus } from '../../transactions/entities/anchor-transaction.entity';

describe('AnchorController', () => {
  let controller: AnchorController;

  const mockAnchorService = {
    initiateDeposit: jest.fn(),
    initiateWithdrawal: jest.fn(),
    listTransactions: jest.fn(),
    getTransactionStats: jest.fn(),
    getTransactionStatus: jest.fn(),
    handleWebhook: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'ANCHOR_WEBHOOK_SECRET') return 'test-secret';
      return undefined;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnchorController],
      providers: [
        {
          provide: AnchorService,
          useValue: mockAnchorService,
        },
        Reflector,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        WebhookSignatureService,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AnchorController>(AnchorController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('deposit', () => {
    it('should call service.initiateDeposit with the DTO', async () => {
      const dto = {
        amount: 100,
        currency: 'USD',
        walletAddress: 'GTEST...',
        type: PaymentMethodType.ACH,
      };
      const mockResult = { id: 'tx-1', status: AnchorTransactionStatus.PENDING };
      mockAnchorService.initiateDeposit.mockResolvedValue(mockResult);
      const result = await controller.deposit(dto);
      expect(mockAnchorService.initiateDeposit).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('withdraw', () => {
    it('should call service.initiateWithdrawal with the DTO', async () => {
      const dto = { amount: 50, currency: 'EUR', walletAddress: 'GTEST...', destination: 'bank-account' };
      const mockResult = { id: 'tx-2', status: AnchorTransactionStatus.PENDING };
      mockAnchorService.initiateWithdrawal.mockResolvedValue(mockResult);
      const result = await controller.withdraw(dto);
      expect(mockAnchorService.initiateWithdrawal).toHaveBeenCalledWith(dto);
      expect(result).toEqual(mockResult);
    });
  });

  describe('listTransactions', () => {
    it('should call service.listTransactions with query params', async () => {
      const query = { page: 1, limit: 20, status: AnchorTransactionStatus.PENDING };
      const mockResult = { data: [], total: 0, page: 1, limit: 20, totalPages: 1 };
      mockAnchorService.listTransactions.mockResolvedValue(mockResult);
      const result = await controller.listTransactions(query);
      expect(mockAnchorService.listTransactions).toHaveBeenCalledWith(query);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getTransactionStats', () => {
    it('should call service.getTransactionStats and return stats', async () => {
      const mockStats = { total: 10, pending: 2, processing: 3, completed: 4, failed: 1, refunded: 0, verified: 5, averageTimeToAnchorSeconds: 120 };
      mockAnchorService.getTransactionStats.mockResolvedValue(mockStats);
      const result = await controller.getTransactionStats();
      expect(mockAnchorService.getTransactionStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getTransactionStatus', () => {
    it('should call service.getTransactionStatus with the id', async () => {
      mockAnchorService.getTransactionStatus.mockResolvedValue({ id: 'tx-123', status: AnchorTransactionStatus.PROCESSING });
      const result = await controller.getTransactionStatus('tx-123');
      expect(mockAnchorService.getTransactionStatus).toHaveBeenCalledWith('tx-123');
      expect(result).toEqual({ id: 'tx-123', status: AnchorTransactionStatus.PROCESSING });
    });
  });

  describe('handleWebhook', () => {
    it('should call service.handleWebhook and return success', async () => {
      const payload = { id: 'anchor-tx-123', status: 'completed', event_id: 'evt-1' };
      mockAnchorService.handleWebhook.mockResolvedValue(undefined);
      const result = await controller.handleWebhook(payload);
      expect(mockAnchorService.handleWebhook).toHaveBeenCalledWith(payload);
      expect(result).toEqual({ success: true });
    });
  });
});
