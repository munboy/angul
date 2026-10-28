import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { RecommendationsService } from './recommendations.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UseGuards(OptionalJwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async getRecommendations(
    @Body() dto: CreateRecommendationDto,
    @Request() req: any,
    @Headers('accept-language') lang: string = 'uk',
  ) {
    const userId: number | undefined = req.user?.sub;
    const result = await this.recommendationsService.getRecommendations(dto, userId, lang);
    return result;
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory(@Request() req: any, @Headers('accept-language') lang: string = 'uk') {
    const history = await this.recommendationsService.getUserHistory(req.user.sub, lang);
    return history;
  }

  @Get('history/:id')
  @UseGuards(JwtAuthGuard)
  async getSessionDetail(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Headers('accept-language') lang: string = 'uk',
  ) {
    const session = await this.recommendationsService.getSessionDetail(
      id,
      req.user.sub,
      lang,
    );
    return session;
  }
}
