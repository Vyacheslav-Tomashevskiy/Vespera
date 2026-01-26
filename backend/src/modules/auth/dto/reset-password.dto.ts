import { IsString, MinLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'abc123token456',
    description: 'Password reset token',
  })
  @IsString()
  token: string;

  @ApiProperty({ example: 'NewStrongP@ss123', description: 'New password' })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message:
      'Password must contain uppercase, lowercase, number and special character',
  })
  newPassword: string;
}
