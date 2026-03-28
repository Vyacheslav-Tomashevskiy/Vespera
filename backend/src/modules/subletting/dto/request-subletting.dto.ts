import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsString, IsUUID, IsOptional } from 'class-validator';

export class RequestSublettingDto {
  @ApiProperty()
  @IsUUID()
  agreementId: string;

  @ApiProperty()
  @IsDateString()
  startDate: string;

  @ApiProperty()
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}
