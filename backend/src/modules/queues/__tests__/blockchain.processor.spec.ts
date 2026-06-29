import { Test, TestingModule } from '@nestjs/testing';
import { Job } from 'bull';
import { BlockchainQueueProcessor, BlockchainJobData } from '../processors/blockchain.processor';
import { StellarService } from '../../stellar/services/stellar.service';
import { PaymentProcessingService } from '../../stellar/services/payment-processing.service';

describe('BlockchainQueueProcessor', () => {
  let processor: BlockchainQueueProcessor;
  let stellarService: jest.Mocked<StellarService>;
  let paymentProcessingService: jest.Mocked<PaymentProcessingService>;

  const mockStellarService = {
    createEscrow: jest.fn(),
    releaseEscrow: jest.fn(),
    refundEscrow: jest.fn(),
    getEscrowById: jest.fn(),
    getTransactionByHash: jest.fn().mockResolvedValue({ transactionHash: 'tx_hash_1' }),
  } as any;

  const mockPaymentProcessingService = {
    processRentPayment: jest.fn(),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlockchainQueueProcessor,
        {
          provide: StellarService,
          useValue: mockStellarService,
        },
        {
          provide: PaymentProcessingService,
          useValue: mockPaymentProcessingService,
        },
      ],
    }).compile();

    processor = module.get<BlockchainQueueProcessor>(BlockchainQueueProcessor);
    stellarService = module.get(StellarService);
    paymentProcessingService = module.get(PaymentProcessingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleBlockchainJob', () => {
    it('should throw an error for unknown job type', async () => {
      const unknownJob = {
        data: {
          type: 'unknown-type' as any,
          data: {},
        } as BlockchainJobData,
        id: 1,
      } as Job<BlockchainJobData>;

      await expect(processor.handleBlockchainJob(unknownJob)).rejects.toThrow(
        'Unknown blockchain type: unknown-type',
      );
      expect(stellarService.createEscrow).not.toHaveBeenCalled();
      expect(stellarService.releaseEscrow).not.toHaveBeenCalled();
      expect(stellarService.getTransactionByHash).not.toHaveBeenCalled();
    });

    it('should call sendPayment for send-payment job type and validate required fields', async () => {
      const sendPaymentJob = {
        data: {
          type: 'send-payment' as const,
          data: { paymentId: 'pay_1' },
          paymentId: 'pay_1',
        } as BlockchainJobData,
        id: 1,
      } as Job<BlockchainJobData>;

      // Missing required fields should throw
      await expect(processor.handleBlockchainJob(sendPaymentJob)).rejects.toThrow(
        'send-payment missing required fields',
      );
    });

    it('should call createEscrow for create-escrow job type', async () => {
      mockStellarService.createEscrow.mockResolvedValue({ id: 1 } as any);

      const createEscrowJob = {
        data: {
          type: 'create-escrow' as const,
          data: {
            sourcePublicKey: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
            destinationPublicKey: 'GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB',
            amount: '100',
            agreementId: 'agr_1',
          },
          agreementId: 'agr_1',
        } as BlockchainJobData,
        id: 2,
      } as Job<BlockchainJobData>;

      await processor.handleBlockchainJob(createEscrowJob);
      expect(mockStellarService.createEscrow).toHaveBeenCalledTimes(1);
      const calledDto = mockStellarService.createEscrow.mock.calls[0][0];
      expect(calledDto.sourcePublicKey).toBe('GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF');
      expect(calledDto.destinationPublicKey).toBe('GBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');
      expect(calledDto.amount).toBe('100');
      expect(calledDto.rentAgreementId).toBe('agr_1');
    });

    it('should throw for create-escrow when required fields missing', async () => {
      const createEscrowJob = {
        data: {
          type: 'create-escrow' as const,
          data: { agreementId: 'agr_1' },
          agreementId: 'agr_1',
        } as BlockchainJobData,
        id: 2,
      } as Job<BlockchainJobData>;

      await expect(processor.handleBlockchainJob(createEscrowJob)).rejects.toThrow(
        'create-escrow missing required fields',
      );
      expect(mockStellarService.createEscrow).not.toHaveBeenCalled();
    });

    it('should call releaseEscrow for release-escrow job type', async () => {
      mockStellarService.releaseEscrow.mockResolvedValue({ id: 1 } as any);

      const releaseEscrowJob = {
        data: {
          type: 'release-escrow' as const,
          data: { escrowId: 42 },
          agreementId: 'agr_1',
        } as BlockchainJobData,
        id: 3,
      } as Job<BlockchainJobData>;

      await processor.handleBlockchainJob(releaseEscrowJob);
      expect(mockStellarService.releaseEscrow).toHaveBeenCalledTimes(1);
      const calledDto = mockStellarService.releaseEscrow.mock.calls[0][0];
      expect(calledDto.escrowId).toBe(42);
    });

    it('should throw for release-escrow when escrowId and agreementId both missing', async () => {
      const releaseEscrowJob = {
        data: {
          type: 'release-escrow' as const,
          data: {},
        } as BlockchainJobData,
        id: 3,
      } as Job<BlockchainJobData>;

      await expect(processor.handleBlockchainJob(releaseEscrowJob)).rejects.toThrow(
        'release-escrow missing required field',
      );
      expect(mockStellarService.releaseEscrow).not.toHaveBeenCalled();
    });

    it('should throw for mint-nft job type (not wired)', async () => {
      const mintNftJob = {
        data: {
          type: 'mint-nft' as const,
          data: { tokenId: 'nft_1' },
        } as BlockchainJobData,
        id: 4,
      } as Job<BlockchainJobData>;

      await expect(processor.handleBlockchainJob(mintNftJob)).rejects.toThrow(
        'mintNft is not wired',
      );
    });

    it('should call getTransactionByHash for sync-transaction job type', async () => {
      mockStellarService.getTransactionByHash.mockResolvedValue({ transactionHash: 'tx_hash_1' } as any);

      const syncTransactionJob = {
        data: {
          type: 'sync-transaction' as const,
          data: { transactionId: 'tx_1' },
          transactionId: 'tx_1',
        } as BlockchainJobData,
        id: 5,
      } as Job<BlockchainJobData>;

      await processor.handleBlockchainJob(syncTransactionJob);
      expect(mockStellarService.getTransactionByHash).toHaveBeenCalledWith('tx_1');
    });

    it('should throw for sync-transaction when transactionId missing', async () => {
      const syncTransactionJob = {
        data: {
          type: 'sync-transaction' as const,
          data: {},
        } as BlockchainJobData,
        id: 5,
      } as Job<BlockchainJobData>;

      await expect(processor.handleBlockchainJob(syncTransactionJob)).rejects.toThrow(
        'sync-transaction missing required field',
      );
      expect(mockStellarService.getTransactionByHash).not.toHaveBeenCalled();
    });

    it('should throw for process-anchor-transaction job type (not wired)', async () => {
      const processAnchorJob = {
        data: {
          type: 'process-anchor-transaction' as const,
          data: { transactionId: 'anchor_tx_1' },
          transactionId: 'anchor_tx_1',
        } as BlockchainJobData,
        id: 6,
      } as Job<BlockchainJobData>;

      await expect(processor.handleBlockchainJob(processAnchorJob)).rejects.toThrow(
        'processAnchorTransaction is not wired',
      );
    });
  });
});
