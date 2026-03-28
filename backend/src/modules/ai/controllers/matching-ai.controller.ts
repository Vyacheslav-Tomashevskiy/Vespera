import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { User } from '../../users/entities/user.entity';
import { MatchingAiService } from '../matching-ai.service';
import { UpdatePreferencesDto } from '../dto/update-preferences.dto';

@ApiTags('AI Matching')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/ai/matching')
export class MatchingAiController {
  constructor(private readonly matchingAiService: MatchingAiService) {}

  @Get('recommendations')
  @ApiOperation({ summary: 'Get personalized property recommendations' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({ status: 200, description: 'Ranked property recommendations' })
  getRecommendations(
    @CurrentUser() user: User,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.matchingAiService.getRecommendations(user.id, limit);
  }

  @Get('match-score/:propertyId')
  @ApiOperation({ summary: 'Get match score for a specific property' })
  @ApiResponse({ status: 200, description: 'Match score and reasons' })
  getMatchScore(
    @CurrentUser() user: User,
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
  ) {
    return this.matchingAiService.getMatchScore(user.id, propertyId);
  }

  @Get('similar/:propertyId')
  @ApiOperation({ summary: 'Get similar properties' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 5 })
  @ApiResponse({ status: 200, description: 'Similar properties list' })
  getSimilarProperties(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Query('limit', new DefaultValuePipe(5), ParseIntPipe) limit: number,
  ) {
    return this.matchingAiService.getSimilarProperties(propertyId, limit);
  }

  @Post('preferences')
  @ApiOperation({ summary: 'Update user matching preferences' })
  @ApiResponse({ status: 201, description: 'Preferences saved' })
  updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.matchingAiService.updatePreferences(user.id, dto);
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get current user preferences' })
  @ApiResponse({ status: 200, description: 'User preferences' })
  getPreferences(@CurrentUser() user: User) {
    return this.matchingAiService.getPreferences(user.id);
  }
}
