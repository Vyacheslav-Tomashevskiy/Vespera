import { IsDateString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPriceDto {
  @ApiProperty({ example: '2026-04-15' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiProperty({ example: 200.0 })
  @IsNumber()
  @Min(0)
  price: number;
}
