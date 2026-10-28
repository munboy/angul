import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RecommendationsService } from './recommendations.service';
import { GoogleAiProviderService } from './providers/google-ai-provider.service';
import { OpenRouterProviderService } from './providers/openrouter-provider.service';
import { RuleBasedRecommenderService } from './providers/rule-based-recommender.service';
import { RecommendationPromptBuilder } from './providers/ai-provider.interface';
import { RecommendationSessionRepository } from './recommendation-session.repository';
import { PrismaService } from '../prisma/prisma.service';

const aiResult = {
  movieTmdbIds: [550],
  explanation: 'Great pick',
  providerUsed: 'google',
  isFallback: false,
};

const ruleResult = {
  movieTmdbIds: [123],
  explanation: 'Rule-based',
  providerUsed: 'rule_based',
  isFallback: true,
};

describe('RecommendationsService — tryProvider()', () => {
  let service: RecommendationsService;
  let google: jest.Mocked<GoogleAiProviderService>;
  let openRouter: jest.Mocked<OpenRouterProviderService>;
  let ruleBased: jest.Mocked<RuleBasedRecommenderService>;
  let sessionRepo: jest.Mocked<RecommendationSessionRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: GoogleAiProviderService,
          useValue: { getRecommendations: jest.fn() },
        },
        {
          provide: OpenRouterProviderService,
          useValue: { getRecommendations: jest.fn() },
        },
        {
          provide: RuleBasedRecommenderService,
          useValue: { getRecommendations: jest.fn() },
        },
        {
          provide: RecommendationPromptBuilder,
          useValue: { buildPrompt: jest.fn().mockReturnValue('test prompt') },
        },
        {
          provide: RecommendationSessionRepository,
          useValue: {
            logAiProvider: jest.fn().mockResolvedValue({}),
            createSession: jest.fn(),
            createRequest: jest.fn(),
            createResults: jest.fn(),
            getUserHistory: jest.fn(),
            getSessionDetail: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            genre: { findUnique: jest.fn() },
            movie: { findUnique: jest.fn(), findMany: jest.fn() },
            watchedMovie: { findMany: jest.fn() },
            userPreference: { findMany: jest.fn() },
            recommendationSession: { update: jest.fn() },
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'ai.primaryProvider') return 'google';
              if (key === 'ai.enableFallback') return true;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    google = module.get(GoogleAiProviderService);
    openRouter = module.get(OpenRouterProviderService);
    ruleBased = module.get(RuleBasedRecommenderService);
    sessionRepo = module.get(RecommendationSessionRepository);
  });

  const callTryProvider = (
    svc: RecommendationsService,
    provider: 'google' | 'openrouter',
    enableFallback: boolean,
  ) => (svc as any).tryProvider(provider, 'test prompt', enableFallback);

  it('Case 1: primary provider succeeds → returns AI result', async () => {
    google.getRecommendations.mockResolvedValue(aiResult as any);

    const result = await callTryProvider(service, 'google', true);

    expect(result).toEqual(aiResult);
    expect(google.getRecommendations).toHaveBeenCalledTimes(1);
    expect(openRouter.getRecommendations).not.toHaveBeenCalled();
  });

  it('Case 2: primary fails, secondary succeeds → falls back to secondary', async () => {
    const secondaryResult = { ...aiResult, providerUsed: 'openrouter' };
    google.getRecommendations.mockRejectedValue(new Error('Google down'));
    openRouter.getRecommendations.mockResolvedValue(secondaryResult as any);

    const result = await callTryProvider(service, 'google', true);

    expect(result).toEqual(secondaryResult);
    expect(google.getRecommendations).toHaveBeenCalledTimes(1);
    expect(openRouter.getRecommendations).toHaveBeenCalledTimes(1);
    expect(ruleBased.getRecommendations).not.toHaveBeenCalled();
  });

  it('Case 3: both providers fail → falls back to rule-based', async () => {
    google.getRecommendations.mockRejectedValue(new Error('Google down'));
    openRouter.getRecommendations.mockRejectedValue(new Error('OpenRouter down'));
    ruleBased.getRecommendations.mockResolvedValue(ruleResult as any);

    const result = await callTryProvider(service, 'google', true);

    expect(result).toEqual(ruleResult);
    expect(ruleBased.getRecommendations).toHaveBeenCalledTimes(1);
  });

  it('Case 4: fallback disabled, primary fails → goes straight to rule-based', async () => {
    google.getRecommendations.mockRejectedValue(new Error('Google down'));
    ruleBased.getRecommendations.mockResolvedValue(ruleResult as any);

    const result = await callTryProvider(service, 'google', false);

    expect(result).toEqual(ruleResult);
    expect(openRouter.getRecommendations).not.toHaveBeenCalled();
    expect(ruleBased.getRecommendations).toHaveBeenCalledTimes(1);
  });
});
