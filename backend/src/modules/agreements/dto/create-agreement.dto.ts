import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsOptional,
  IsDateString,
  Min,
  Max,
  Length,
  Matches,
} from 'class-validator';

export class CreateAgreementDto {
  @IsNotEmpty()
  @IsString()
  propertyId: string;

  @IsNotEmpty()
  @IsString()
  landlordId: string;

  @IsNotEmpty()
  @IsString()
  tenantId: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  // Stellar Public Keys (56 characters for Stellar addresses)
  @IsNotEmpty()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Landlord Stellar public key must be a valid Stellar address starting with G',
  })
  landlordStellarPubKey: string;

  @IsNotEmpty()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Tenant Stellar public key must be a valid Stellar address starting with G',
  })
  tenantStellarPubKey: string;

  @IsOptional()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Agent Stellar public key must be a valid Stellar address starting with G',
  })
  agentStellarPubKey?: string;

  @IsOptional()
  @IsString()
  @Length(56, 56)
  @Matches(/^G[A-Z0-9]{55}$/, {
    message:
      'Escrow account public key must be a valid Stellar address starting with G',
  })
  escrowAccountPubKey?: string;

  // Financial Terms
  @IsNumber()
  @Min(0)
  monthlyRent: number;

  @IsNumber()
  @Min(0)
  securityDeposit: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  agentCommissionRate?: number;

  // Lease Terms
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @IsNotEmpty()
  @IsDateString()
  endDate: string;

  // Terms and Conditions
  @IsOptional()
  @IsString()
  termsAndConditions?: string;
}
