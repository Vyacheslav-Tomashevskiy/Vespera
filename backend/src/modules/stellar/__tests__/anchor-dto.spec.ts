import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
  DepositRequestDto,
  PaymentMethodType,
} from '../dto/deposit-request.dto';
import { WithdrawRequestDto } from '../dto/withdraw-request.dto';

describe('DepositRequestDto', () => {
  const validBase = {
    amount: 100,
    currency: 'USD',
    walletAddress: 'GABCDE1234567890',
    type: PaymentMethodType.ACH,
  };

  async function validateDto(plain: object) {
    const dto = plainToInstance(DepositRequestDto, plain);
    return validate(dto);
  }

  it('should pass validation with a valid positive amount', async () => {
    const errors = await validateDto(validBase);
    expect(errors.length).toBe(0);
  });

  it('should reject a zero amount', async () => {
    const errors = await validateDto({ ...validBase, amount: 0 });
    expect(errors.length).toBeGreaterThan(0);
    const amountError = errors.find((e) => e.property === 'amount');
    expect(amountError).toBeDefined();
    expect(amountError!.constraints).toHaveProperty('min');
    expect(amountError!.constraints!.min).toBe(
      'amount must be greater than zero',
    );
  });

  it('should reject a negative amount', async () => {
    const errors = await validateDto({ ...validBase, amount: -10 });
    expect(errors.length).toBeGreaterThan(0);
    const amountError = errors.find((e) => e.property === 'amount');
    expect(amountError).toBeDefined();
    expect(amountError!.constraints).toHaveProperty('min');
    expect(amountError!.constraints!.min).toBe(
      'amount must be greater than zero',
    );
  });

  it('should reject a very small but still effectively-zero amount (0.00000000001)', async () => {
    const errors = await validateDto({ ...validBase, amount: 0.00000000001 });
    expect(errors.length).toBeGreaterThan(0);
    const amountError = errors.find((e) => e.property === 'amount');
    expect(amountError).toBeDefined();
  });

  it('should accept the minimum valid amount (0.0000001)', async () => {
    const errors = await validateDto({ ...validBase, amount: 0.0000001 });
    expect(errors.length).toBe(0);
  });

  it('should accept a fractional positive amount', async () => {
    const errors = await validateDto({ ...validBase, amount: 0.5 });
    expect(errors.length).toBe(0);
  });
});

describe('WithdrawRequestDto', () => {
  const validBase = {
    amount: 50,
    currency: 'USD',
    destination: 'bank-account-123',
    walletAddress: 'GABCDE1234567890',
  };

  async function validateDto(plain: object) {
    const dto = plainToInstance(WithdrawRequestDto, plain);
    return validate(dto);
  }

  it('should pass validation with a valid positive amount', async () => {
    const errors = await validateDto(validBase);
    expect(errors.length).toBe(0);
  });

  it('should reject a zero amount', async () => {
    const errors = await validateDto({ ...validBase, amount: 0 });
    expect(errors.length).toBeGreaterThan(0);
    const amountError = errors.find((e) => e.property === 'amount');
    expect(amountError).toBeDefined();
    expect(amountError!.constraints).toHaveProperty('min');
    expect(amountError!.constraints!.min).toBe(
      'amount must be greater than zero',
    );
  });

  it('should reject a negative amount', async () => {
    const errors = await validateDto({ ...validBase, amount: -1 });
    expect(errors.length).toBeGreaterThan(0);
    const amountError = errors.find((e) => e.property === 'amount');
    expect(amountError).toBeDefined();
    expect(amountError!.constraints).toHaveProperty('min');
    expect(amountError!.constraints!.min).toBe(
      'amount must be greater than zero',
    );
  });

  it('should reject a very small but still effectively-zero amount (0.00000000001)', async () => {
    const errors = await validateDto({ ...validBase, amount: 0.00000000001 });
    expect(errors.length).toBeGreaterThan(0);
    const amountError = errors.find((e) => e.property === 'amount');
    expect(amountError).toBeDefined();
  });

  it('should accept the minimum valid amount (0.0000001)', async () => {
    const errors = await validateDto({ ...validBase, amount: 0.0000001 });
    expect(errors.length).toBe(0);
  });

  it('should accept a fractional positive amount', async () => {
    const errors = await validateDto({ ...validBase, amount: 0.01 });
    expect(errors.length).toBe(0);
  });
});
