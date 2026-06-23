import { IsNumber, IsString, IsEnum, IsNotEmpty, Min } from 'class-validator';

export enum PaymentMethodType {
  SEPA = 'SEPA',
  SWIFT = 'SWIFT',
  ACH = 'ACH',
}

export class DepositRequestDto {
  @IsNumber()
  @IsNotEmpty()
  @Min(0.0000001, { message: 'amount must be greater than zero' })
  amount: number;

  @IsString()
  @IsNotEmpty()
  currency: string;

  @IsString()
  @IsNotEmpty()
  walletAddress: string;

  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  type: PaymentMethodType;
}
