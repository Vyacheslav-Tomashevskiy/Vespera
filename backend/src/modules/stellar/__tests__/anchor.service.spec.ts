import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { BadRequestException } from '@nestjs/common';
import { AnchorService } from '../services/anchor.service';
import {
  AnchorTransaction,
  AnchorTransactionStatus,
} from '../../transactions/entities/anchor-transaction.entity';
import { SupportedCurrency } from '../../transactions/entities/supported-currency.entity';
import { PaymentMethodType } from '../dto/deposit-request.dto';

describe('AnchorService', () => {
  let service: AnchorService;

  // Shared in-transaction repo handed back by queryRunner.manager. Each
  // test installs its own findOne / save behaviour on this stub.
  const txRepo = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const queryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      getRepository: jest.fn(() => txRepo),
    },
  };

  const mockAnchorTransactionRepo = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    manager: {
      connection: {
        createQueryRunner: jest.fn(() => queryRunner),
      },
    },
  };

  const mockSupportedCurrencyRepo = {
    findOne: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: string) => {
      const config = {
        ANCHOR_API_URL: 'https://test-anchor.com',
        ANCHOR_API_KEY: 'test-key',
        SUPPORTED_FIAT_CURRENCIES: 'USD,EUR,GBP,NGN',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnchorService,
        {
          provide: getRepositoryToken(AnchorTransaction),
          useValue: mockAnchorTransactionRepo,
        },
        {
          provide: getRepositoryToken(SupportedCurrency),
          useValue: mockSupportedCurrencyRepo,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AnchorService>(AnchorService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateDeposit', () => {
    it('should throw error for unsupported currency', async () => {
      const dto = {
        amount: 100,
        currency: 'XYZ',
        walletAddress: 'GTEST...',
        type: PaymentMethodType.ACH,
      };

      await expect(service.initiateDeposit(dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if currency not configured', async () => {
      const dto = {
        amount: 100,
        currency: 'USD',
        walletAddress: 'GTEST...',
        type: PaymentMethodType.ACH,
      };

      mockSupportedCurrencyRepo.findOne.mockResolvedValue(null);

      await expect(service.initiateDeposit(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('initiateWithdrawal', () => {
    it('should throw error for unsupported currency', async () => {
      const dto = {
        amount: 100,
        currency: 'XYZ',
        destination: 'bank-account',
        walletAddress: 'GTEST...',
      };

      await expect(service.initiateWithdrawal(dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getTransactionStatus', () => {
    it('should throw error if transaction not found', async () => {
      mockAnchorTransactionRepo.findOne.mockResolvedValue(null);

      await expect(service.getTransactionStatus('invalid-id')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should return transaction if found', async () => {
      const mockTransaction = {
        id: 'test-id',
        status: AnchorTransactionStatus.PENDING,
        anchorTransactionId: null,
      };

      mockAnchorTransactionRepo.findOne.mockResolvedValue(mockTransaction);

      const result = await service.getTransactionStatus('test-id');
      expect(result).toEqual(mockTransaction);
    });
  });

  describe('handleWebhook', () => {
    const buildRow = (
      overrides: Partial<AnchorTransaction> = {},
    ): AnchorTransaction =>
      ({
        id: 'local-tx-1',
        anchorTransactionId: 'anchor-tx-123',
        status: AnchorTransactionStatus.PENDING,
        metadata: {},
        processedEventIds: [],
        version: 1,
        ...overrides,
      }) as AnchorTransaction;

    it('persists the mapped status and stellar id and tracks the event', async () => {
      const payload = {
        id: 'anchor-tx-123',
        status: 'completed',
        event_id: 'evt-1',
        stellar_transaction_id: 'stellar-tx-456',
      };

      const row = buildRow();
      mockAnchorTransactionRepo.findOne.mockResolvedValue({ id: row.id });
      txRepo.findOne.mockResolvedValue(row);
      txRepo.save.mockImplementation((value) => value);

      await service.handleWebhook(payload);

      expect(txRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AnchorTransactionStatus.COMPLETED,
          stellarTransactionId: 'stellar-tx-456',
          processedEventIds: ['evt-1'],
        }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('drops duplicate deliveries by event_id without rewriting the row', async () => {
      const payload = {
        id: 'anchor-tx-123',
        status: 'completed',
        event_id: 'evt-1',
      };

      const row = buildRow({
        processedEventIds: ['evt-1'],
        status: AnchorTransactionStatus.PROCESSING,
      });
      mockAnchorTransactionRepo.findOne.mockResolvedValue({ id: row.id });
      txRepo.findOne.mockResolvedValue(row);

      await service.handleWebhook(payload);

      expect(txRepo.save).not.toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('refuses to regress out of a terminal status but still records the event', async () => {
      const payload = {
        id: 'anchor-tx-123',
        status: 'pending_anchor',
        event_id: 'evt-late',
      };

      const row = buildRow({
        status: AnchorTransactionStatus.COMPLETED,
        processedEventIds: ['evt-final'],
      });
      mockAnchorTransactionRepo.findOne.mockResolvedValue({ id: row.id });
      txRepo.findOne.mockResolvedValue(row);
      txRepo.save.mockImplementation((value) => value);

      await service.handleWebhook(payload);

      // Status is preserved as COMPLETED.
      expect(txRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AnchorTransactionStatus.COMPLETED,
          processedEventIds: ['evt-final', 'evt-late'],
        }),
      );
    });

    it('does not spread unknown payload fields into metadata', async () => {
      const payload = {
        id: 'anchor-tx-123',
        status: 'pending_anchor',
        event_id: 'evt-meta',
        amount_in: '10.0',
        // intentional junk that must NOT land in metadata
        secret_field: 'should-be-dropped',
        admin_override: true,
      } as any;

      const row = buildRow();
      mockAnchorTransactionRepo.findOne.mockResolvedValue({ id: row.id });
      txRepo.findOne.mockResolvedValue(row);
      txRepo.save.mockImplementation((value) => value);

      await service.handleWebhook(payload);

      const saved = txRepo.save.mock.calls[0][0];
      expect(saved.metadata).toEqual({ amount_in: '10.0' });
      expect(saved.metadata).not.toHaveProperty('secret_field');
      expect(saved.metadata).not.toHaveProperty('admin_override');
    });

    it('serializes concurrent deliveries through the row lock — the second wins on event id but does not double-write', async () => {
      mockAnchorTransactionRepo.findOne.mockResolvedValue({ id: 'local-tx-1' });

      // First delivery: PENDING → PROCESSING with evt-A.
      // Second delivery arrives during the lock; by the time it reloads
      // the row, the first has already advanced it and pushed evt-A.
      let savedRow = buildRow();
      txRepo.findOne
        .mockResolvedValueOnce(savedRow)
        .mockImplementationOnce(async () => savedRow);
      txRepo.save.mockImplementation((value) => {
        savedRow = { ...value };
        return value;
      });

      await service.handleWebhook({
        id: 'anchor-tx-123',
        status: 'pending_anchor',
        event_id: 'evt-A',
      });

      // Replay the same event id — must be treated as a duplicate.
      await service.handleWebhook({
        id: 'anchor-tx-123',
        status: 'pending_anchor',
        event_id: 'evt-A',
      });

      // Only the first delivery should have written.
      expect(txRepo.save).toHaveBeenCalledTimes(1);
      expect(queryRunner.startTransaction).toHaveBeenCalledTimes(2);
      expect(queryRunner.release).toHaveBeenCalledTimes(2);
    });

    it("drops an out-of-order delivery whose sequence is below the row's last_sequence", async () => {
      const row = buildRow({
        status: AnchorTransactionStatus.PROCESSING,
        metadata: { last_sequence: 5 },
      });
      mockAnchorTransactionRepo.findOne.mockResolvedValue({ id: row.id });
      txRepo.findOne.mockResolvedValue(row);
      txRepo.save.mockImplementation((value) => value);

      await service.handleWebhook({
        id: 'anchor-tx-123',
        status: 'pending_anchor',
        event_id: 'evt-stale',
        sequence: 3,
      });

      const saved = txRepo.save.mock.calls[0][0];
      // Status stays where it was — the late delivery does not regress
      // it. The event id IS recorded so a redelivery of the same stale
      // payload is dropped at the dedup check next time.
      expect(saved.status).toBe(AnchorTransactionStatus.PROCESSING);
      expect(saved.metadata).toEqual({ last_sequence: 5 });
      expect(saved.processedEventIds).toContain('evt-stale');
    });

    it('logs and returns early for an unknown anchor transaction id', async () => {
      mockAnchorTransactionRepo.findOne.mockResolvedValue(null);

      await service.handleWebhook({
        id: 'unknown-anchor-tx',
        status: 'completed',
        event_id: 'evt-x',
      });

      expect(queryRunner.startTransaction).not.toHaveBeenCalled();
      expect(txRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('listTransactions', () => {
    it('should return paginated anchor transactions', async () => {
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([
          [
            {
              id: 'anchor-1',
              status: AnchorTransactionStatus.PROCESSING,
            },
          ],
          1,
        ]),
      };

      mockAnchorTransactionRepo.createQueryBuilder.mockReturnValue(
        queryBuilder,
      );

      const result = await service.listTransactions({
        page: 1,
        limit: 20,
        status: AnchorTransactionStatus.PROCESSING,
        search: 'anchor-1',
      });

      expect(result).toEqual({
        data: [{ id: 'anchor-1', status: AnchorTransactionStatus.PROCESSING }],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
      expect(mockAnchorTransactionRepo.createQueryBuilder).toHaveBeenCalledWith(
        'anchorTransaction',
      );
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
    });

    it('should restrict fuzzy search to indexed columns (no id::text/currency/destination/memo)', async () => {
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };

      mockAnchorTransactionRepo.createQueryBuilder.mockReturnValue(queryBuilder);

      await service.listTransactions({
        page: 1,
        limit: 20,
        search: 'test-term',
      });

      const bracketsCall = queryBuilder.andWhere.mock.calls.find(
        (call) => call[0] && typeof call[0] === 'object',
      );
      expect(bracketsCall).toBeDefined();
      expect(queryBuilder.getManyAndCount).toHaveBeenCalled();
    });
  });

  describe('getTransactionStats', () => {
    it('should calculate anchor transaction statistics', async () => {
      mockAnchorTransactionRepo.count
        .mockResolvedValueOnce(12)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(6);
      mockAnchorTransactionRepo.find.mockResolvedValue([
        {
          createdAt: new Date('2026-03-01T10:00:00.000Z'),
          updatedAt: new Date('2026-03-01T10:02:00.000Z'),
        },
        {
          createdAt: new Date('2026-03-01T11:00:00.000Z'),
          updatedAt: new Date('2026-03-01T11:01:00.000Z'),
        },
      ]);

      const result = await service.getTransactionStats();

      expect(result).toEqual({
        total: 12,
        pending: 2,
        processing: 3,
        completed: 5,
        failed: 1,
        refunded: 1,
        verified: 6,
        averageTimeToAnchorSeconds: 90,
      });
    });
  });
});
