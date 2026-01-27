import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyEmailDto {
  @ApiProperty({
    example: 'abc123token456',
    description: 'Email verification token',
  })
  @IsString()
  token: string;
}
