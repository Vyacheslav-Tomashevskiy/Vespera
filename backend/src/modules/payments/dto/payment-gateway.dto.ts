import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsNumberString,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class ProcessStellarRentGatewayDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid Stellar public key format',
  })
  tenantAddress: string;

  @ApiProperty({
    description:
      '⚠️ SECURITY WARNING: Stellar SECRET seed (S-prefixed). ' +
      "Submitting a seed lets the server spend the tenant's funds and " +
      'puts the seed in transit through any layer that captures request ' +
      'bodies (logs, audit trails, error trackers). Prefer the ' +
      'client-signed XDR flow once it is available. This endpoint is ' +
      'disabled unless ALLOW_SERVER_SIDE_TENANT_SIGNING=true is set in ' +
      'the server environment.',
    example: 'SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^S[A-Z2-7]{55}$/, {
    message: 'tenantSecret must be a Stellar S-prefixed secret seed',
  })
  tenantSecret: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  agreementId: string;

  @ApiProperty()
  @IsNumberString()
  @IsNotEmpty()
  amount: string;

  @ApiPropertyOptional({
    description:
      'Optional idempotency key for safely retrying payment creation',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CreateEscrowGatewayDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid source public key format',
  })
  sourcePublicKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^G[A-Z0-9]{55}$/, {
    message: 'Invalid destination public key format',
  })
  destinationPublicKey: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d+(\.\d{1,7})?$/, {
    message: 'Amount must be a positive number with up to 7 decimal places',
  })
  amount: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agreementId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  expirationDate?: string;

  @ApiPropertyOptional({
    description: 'Optional idempotency key for safely retrying escrow creation',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class ReleaseEscrowGatewayDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  memo?: string;
}

export class RefundEscrowGatewayDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReconcilePaymentsDto {
  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 50;
}

export class RetryFailedPaymentsDto {
  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;
}

export class PaymentGatewayWebhookDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  eventType: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  paymentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceNumber?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  transactionHash?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  error?: string;
}
