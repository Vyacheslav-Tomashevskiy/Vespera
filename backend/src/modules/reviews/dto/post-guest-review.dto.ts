import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Max, Min, IsBoolean } from 'class-validator';

export class PostGuestReviewDto {
  @ApiProperty()
  @IsString()
  bookingId: string;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  cleanliness: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  communication: number;

  @ApiProperty({ minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  respectForRules: number;

  @ApiProperty()
  @IsString()
  comment: string;

  @ApiProperty()
  @IsBoolean()
  wouldHostAgain: boolean;
}
