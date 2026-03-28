import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class ApproveSublettingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
