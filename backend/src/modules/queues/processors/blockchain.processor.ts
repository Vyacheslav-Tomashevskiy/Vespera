import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { StellarService } from '../../stellar/services/stellar.service';
import { PaymentProcessingService } from '../../stellar/services/payment-processing.service';
import { CreateEscrowDto, ReleaseEscrowDto } from '../../stellar/dto/escrow.dto';

export interface BlockchainJobData {
  type:
    | 'send-payment'
    | 'create-escrow'
    | 'release-escrow'
    | 'mint-nft'
    | 'sync-transaction'
    | 'process-anchor-transaction';
  transactionId?: string;
  agreementId?: string;
  paymentId?: string;
  data: Record<string, any>;
}

@Processor('blockchain')
export class BlockchainQueueProcessor {
  private readonly logger = new Logger(BlockchainQueueProcessor.name);

  constructor(
    private stellarService: StellarService,
    private paymentProcessingService: PaymentProcessingService,
  ) {}

  @Process()
  async handleBlockchainJob(job: Job<BlockchainJobData>): Promise<void> {
    this.logger.log(`Processing blockchain job ${job.id}: ${job.data.type}`);

    try {
      switch (job.data.type) {
        case 'send-payment':
          await this.sendPayment(job.data);
          break;

        case 'create-escrow':
          await this.createEscrow(job.data);
          break;

        case 'release-escrow':
          await this.releaseEscrow(job.data);
          break;

        case 'mint-nft':
          await this.mintNft(job.data);
          break;

        case 'sync-transaction':
          await this.syncTransaction(job.data);
          break;

        case 'process-anchor-transaction':
          await this.processAnchorTransaction(job.data);
          break;

        default:
          throw new Error(`Unknown blockchain type: ${String(job.data.type)}`);
      }

      this.logger.log(`Blockchain job ${job.id} completed successfully`);
    } catch (error) {
      this.logger.error(
        `Blockchain job ${job.id} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : '',
      );
      throw error;
    }
  }

  private async sendPayment(data: BlockchainJobData): Promise<void> {
    const { sourcePublicKey, amount, agreementId: agrId } = data.data;
    if (!sourcePublicKey || !amount || !agrId) {
      throw new Error(
        `send-payment missing required fields: sourcePublicKey=${typeof sourcePublicKey}, amount=${typeof amount}, agreementId=${typeof agrId}`,
      );
    }
    this.logger.log(`Sending payment: source=${sourcePublicKey} amount=${amount} agreement=${agrId}`);

    if (data.paymentId) {
      this.logger.debug(`Processing payment: ${data.paymentId}`);
    }
  }

  private async createEscrow(data: BlockchainJobData): Promise<void> {
    const { sourcePublicKey, destinationPublicKey, amount } = data.data;
    if (!sourcePublicKey || !destinationPublicKey || !amount) {
      throw new Error(
        `create-escrow missing required fields: sourcePublicKey=${typeof sourcePublicKey}, destinationPublicKey=${typeof destinationPublicKey}, amount=${typeof amount}`,
      );
    }
    this.logger.log(`Creating escrow: source=${sourcePublicKey} dest=${destinationPublicKey} amount=${amount}`);

    const dto = new CreateEscrowDto();
    (dto as any).sourcePublicKey = sourcePublicKey;
    (dto as any).destinationPublicKey = destinationPublicKey;
    (dto as any).amount = amount;
    if (data.agreementId) (dto as any).rentAgreementId = data.agreementId;

    await this.stellarService.createEscrow(dto);
  }

  private async releaseEscrow(data: BlockchainJobData): Promise<void> {
    if (!data.agreementId && !data.data?.escrowId) {
      throw new Error(
        'release-escrow missing required field: agreementId or data.escrowId',
      );
    }
    this.logger.log(`Releasing escrow: agreementId=${data.agreementId ?? 'none'}`);

    const dto = new ReleaseEscrowDto();
    (dto as any).escrowId = data.data?.escrowId ?? data.agreementId;

    await this.stellarService.releaseEscrow(dto);
  }

  private async mintNft(data: BlockchainJobData): Promise<void> {
    throw new Error(
      `mintNft is not wired — no blockchain service method available for agreementId=${data.agreementId ?? 'unknown'}`,
    );
  }

  private async syncTransaction(data: BlockchainJobData): Promise<void> {
    if (!data.transactionId && !data.data?.transactionId) {
      throw new Error(
        'sync-transaction missing required field: transactionId or data.transactionId',
      );
    }
    const txId = data.transactionId ?? data.data.transactionId;
    this.logger.log(`Syncing transaction: ${txId}`);

    await this.stellarService.getTransactionByHash(txId);
  }

  private async processAnchorTransaction(
    data: BlockchainJobData,
  ): Promise<void> {
    throw new Error(
      `processAnchorTransaction is not wired — no blockchain service method available for transactionId=${data.transactionId ?? 'unknown'}`,
    );
  }
}
