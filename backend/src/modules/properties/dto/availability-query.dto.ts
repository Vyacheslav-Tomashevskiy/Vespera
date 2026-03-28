import { IsDateString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AvailabilityQueryDto {
  @ApiProperty({
    example: '2026-04-01',
    description: 'Start date (YYYY-MM-DD)',
  })
  @IsNotEmpty()
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: '2026-04-30', description: 'End date (YYYY-MM-DD)' })
  @IsNotEmpty()
  @IsDateString()
  endDate: string;
}
