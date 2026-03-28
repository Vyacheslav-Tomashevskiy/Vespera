import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './review.entity';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { ReviewPromptService } from '../reviews/review-prompt.service';
import { GuestReview } from './entities/guest-review.entity';
import { HostReview } from './entities/host-review.entity';
import { RentAgreement } from '../rent/entities/rent-contract.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, GuestReview, HostReview, RentAgreement]),
  ],
  providers: [ReviewsService, ReviewPromptService],
  controllers: [ReviewsController],
  exports: [ReviewsService, ReviewPromptService],
})
export class ReviewsModule {}
