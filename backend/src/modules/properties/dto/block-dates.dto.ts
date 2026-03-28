import { ArrayNotEmpty, IsArray, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class BlockDatesDto {
  @ApiProperty({ example: ['2026-04-10', '2026-04-11'], type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @IsDateString({}, { each: true })
  dates: string[];
}
