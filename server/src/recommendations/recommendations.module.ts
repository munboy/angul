import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsService } from './recommendations.service';
import { RecommendationsController } from './recommendations.controller';
import { GoogleAiProviderService } from './providers/google-ai-provider.service';
import { OpenRouterProviderService } from './providers/openrouter-provider.service';
import { RuleBasedRecommenderService } from './providers/rule-based-recommender.service';
import { RecommendationPromptBuilder } from './providers/ai-provider.interface';
import { RecommendationSessionRepository } from './recommendation-session.repository';

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [RecommendationsController],
  providers: [
    RecommendationsService,
    GoogleAiProviderService,
    OpenRouterProviderService,
    RuleBasedRecommenderService,
    RecommendationPromptBuilder,
    RecommendationSessionRepository,
  ],
  exports: [RecommendationsService],
})
export class RecommendationsModule {}
