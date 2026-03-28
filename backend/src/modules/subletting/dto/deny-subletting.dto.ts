import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class DenySublettingDto {
  @ApiProperty()
  @IsString()
  reason: string;
}
