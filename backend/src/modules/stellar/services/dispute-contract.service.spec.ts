import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DisputeContractService } from './dispute-contract.service';

describe('DisputeContractService', () => {
  let service: DisputeContractService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        DISPUTE_CONTRACT_ID:
          'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
        SOROBAN_RPC_URL: 'https://soroban-testnet.stellar.org',
        STELLAR_NETWORK: 'testnet',
        STELLAR_ADMIN_SECRET_KEY: '',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DisputeContractService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DisputeContractService>(DisputeContractService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should have contract configuration', () => {
    expect(service['contractId']).toBe(
      'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    );
    expect(service['rpcUrl']).toBe('https://soroban-testnet.stellar.org');
    expect(service['network']).toBe('testnet');
  });

  it('should have all dispute methods', () => {
    expect(service.addArbiter).toBeDefined();
    expect(service.raiseDispute).toBeDefined();
    expect(service.voteOnDispute).toBeDefined();
    expect(service.resolveDispute).toBeDefined();
    expect(service.getDispute).toBeDefined();
    expect(service.getArbiter).toBeDefined();
    expect(service.getArbiterCount).toBeDefined();
    expect(service.getVote).toBeDefined();
  });
});
