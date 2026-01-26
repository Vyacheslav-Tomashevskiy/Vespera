import {
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  Min,
  MaxLength,
} from 'class-validator';

export class RecordPaymentDto {
  @IsNotEmpty()
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsNotEmpty()
  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  referenceNumber?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
