import { PartialType } from '@nestjs/mapped-types';
import { PostGuestReviewDto } from './post-guest-review.dto';

export class UpdateReviewDto extends PartialType(PostGuestReviewDto) {}
