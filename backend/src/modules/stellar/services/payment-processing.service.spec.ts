import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { SorobanRpc } from '@stellar/stellar-sdk';
import {
  PaymentProcessingService,
  TransactionPollTimeoutError,
} from './payment-processing.service';

/**
 * Unit tests for the polling/submission resilience added for issue #39:
 * bounded backoff + jitter + overall deadline, transient-vs-final error
 * handling, and hash-preserving timeout.
 */
describe('PaymentProcessingService — polling resilience (#39)', () => {
  const HASH = 'abc123def456';

  // Tiny delays so the backoff/jitter loop runs effectively instantly.
  const fastConfig: Record<string, string> = {
    SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
    PAYMENT_PROCESSING_CONTRACT_ID:
      'CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC',
    STELLAR_NETWORK: 'testnet',
    STELLAR_POLL_MAX_ATTEMPTS: '4',
    STELLAR_POLL_BASE_DELAY_MS: '1',
    STELLAR_POLL_MAX_DELAY_MS: '2',
    STELLAR_POLL_DEADLINE_MS: '1000',
    STELLAR_SEND_MAX_RETRIES: '3',
  };

  function buildService(): {
    service: PaymentProcessingService;
    server: { getTransaction: jest.Mock; sendTransaction: jest.Mock };
  } {
    const configService = {
      get: jest.fn((key: string) => fastConfig[key]),
    } as unknown as ConfigService;
    const dataSource = {
      getRepository: jest.fn(() => ({})),
    } as unknown as DataSource;

    const service = new PaymentProcessingService(configService, dataSource);
    const server = {
      getTransaction: jest.fn(),
      sendTransaction: jest.fn(),
    };
    // Swap the real Soroban RPC server for our mock.
    (service as unknown as { server: typeof server }).server = server;
    return { service, server };
  }

  const poll = (service: PaymentProcessingService, hash: string) =>
    (
      service as unknown as {
        pollTransactionStatus: (h: string) => Promise<string>;
      }
    ).pollTransactionStatus(hash);

  const send = (service: PaymentProcessingService, tx: unknown) =>
    (
      service as unknown as {
        sendTransactionWithRetry: (t: unknown) => Promise<unknown>;
      }
    ).sendTransactionWithRetry(tx);

  describe('pollTransactionStatus', () => {
    it('keeps polling on transient RPC errors and resolves once confirmed', async () => {
      const { service, server } = buildService();
      server.getTransaction
        .mockRejectedValueOnce(new Error('network unreachable'))
        .mockRejectedValueOnce(
          Object.assign(new Error('rate limited'), {
            response: { status: 429 },
          }),
        )
        .mockResolvedValueOnce({
          status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
        });

      await expect(poll(service, HASH)).resolves.toBe(HASH);
      expect(server.getTransaction).toHaveBeenCalledTimes(3);
    });

    it('keeps polling while NOT_FOUND and resolves on later SUCCESS', async () => {
      const { service, server } = buildService();
      server.getTransaction
        .mockResolvedValueOnce({
          status: SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
        })
        .mockResolvedValueOnce({
          status: SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
        })
        .mockResolvedValueOnce({
          status: SorobanRpc.Api.GetTransactionStatus.SUCCESS,
        });

      await expect(poll(service, HASH)).resolves.toBe(HASH);
      expect(server.getTransaction).toHaveBeenCalledTimes(3);
    });

    it('throws immediately on a definitive FAILED status', async () => {
      const { service, server } = buildService();
      server.getTransaction.mockResolvedValue({
        status: SorobanRpc.Api.GetTransactionStatus.FAILED,
      });

      await expect(poll(service, HASH)).rejects.toThrow(
        `Transaction failed: ${HASH}`,
      );
      // Definitive failure must not be retried.
      expect(server.getTransaction).toHaveBeenCalledTimes(1);
    });

    it('throws a hash-bearing TransactionPollTimeoutError when never confirmed', async () => {
      const { service, server } = buildService();
      server.getTransaction.mockResolvedValue({
        status: SorobanRpc.Api.GetTransactionStatus.NOT_FOUND,
      });

      await expect(poll(service, HASH)).rejects.toBeInstanceOf(
        TransactionPollTimeoutError,
      );
      try {
        await poll(service, HASH);
      } catch (e) {
        expect((e as TransactionPollTimeoutError).hash).toBe(HASH);
      }
    });

    it('fails fast on a non-transient RPC error', async () => {
      const { service, server } = buildService();
      server.getTransaction.mockRejectedValue(
        new Error('invalid hash encoding'),
      );

      await expect(poll(service, HASH)).rejects.toThrow(
        'invalid hash encoding',
      );
      expect(server.getTransaction).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendTransactionWithRetry', () => {
    it('retries transient submission errors then succeeds', async () => {
      const { service, server } = buildService();
      server.sendTransaction
        .mockRejectedValueOnce(new Error('fetch failed'))
        .mockResolvedValueOnce({ status: 'PENDING', hash: HASH });

      await expect(send(service, {})).resolves.toMatchObject({
        status: 'PENDING',
        hash: HASH,
      });
      expect(server.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('retries TRY_AGAIN_LATER then returns the eventual response', async () => {
      const { service, server } = buildService();
      server.sendTransaction
        .mockResolvedValueOnce({ status: 'TRY_AGAIN_LATER' })
        .mockResolvedValueOnce({ status: 'PENDING', hash: HASH });

      await expect(send(service, {})).resolves.toMatchObject({
        status: 'PENDING',
      });
      expect(server.sendTransaction).toHaveBeenCalledTimes(2);
    });

    it('fails fast on a definitive ERROR status', async () => {
      const { service, server } = buildService();
      server.sendTransaction.mockResolvedValue({
        status: 'ERROR',
        errorResult: { code: 'tx_bad_auth' },
      });

      await expect(send(service, {})).rejects.toThrow(
        'Transaction submission rejected',
      );
      expect(server.sendTransaction).toHaveBeenCalledTimes(1);
    });
  });
});
