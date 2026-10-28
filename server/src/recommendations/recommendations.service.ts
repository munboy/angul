import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecommendationDto } from './dto/create-recommendation.dto';
import {
  RecommendationResponseDto,
  RecommendationMovieCard,
  NormalizedRecommendationResult,
} from './dto/recommendation-response.dto';
import { GoogleAiProviderService } from './providers/google-ai-provider.service';
import { OpenRouterProviderService } from './providers/openrouter-provider.service';
import { RuleBasedRecommenderService } from './providers/rule-based-recommender.service';
import { RecommendationPromptBuilder } from './providers/ai-provider.interface';
import { RecommendationSessionRepository } from './recommendation-session.repository';

@Injectable()
export class RecommendationsService {
  private readonly logger = new Logger(RecommendationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly google: GoogleAiProviderService,
    private readonly openRouter: OpenRouterProviderService,
    private readonly ruleBased: RuleBasedRecommenderService,
    private readonly promptBuilder: RecommendationPromptBuilder,
    private readonly sessionRepo: RecommendationSessionRepository,
  ) {}

  async getRecommendations(
    dto: CreateRecommendationDto,
    userId?: number,
    lang = 'uk',
  ): Promise<RecommendationResponseDto> {
    const userContext = userId ? await this.resolveUserContext(userId) : null;

    const genreName = dto.genreId
      ? (await this.prisma.genre.findUnique({ where: { id: dto.genreId } }))?.name
      : undefined;

    const seedMovieTitle = dto.seedMovieId
      ? (await this.prisma.movie.findUnique({ where: { id: dto.seedMovieId } }))?.title
      : undefined;

    const prompt = this.promptBuilder.buildPrompt({
      entryType: dto.entryType,
      scenarioKey: dto.scenarioKey,
      moodInput: dto.moodInput,
      freeTextPrompt: dto.freeTextPrompt,
      genreName,
      seedMovieTitle,
      favoriteGenreNames: userContext?.favoriteGenreNames,
      watchedCount: userContext?.watchedMovieIds.length,
      refinements: dto.refinements as Record<string, boolean> | undefined,
    });

    let result: NormalizedRecommendationResult | null = null;
    const primaryProvider = this.config.get<string>('ai.primaryProvider') ?? 'google';
    const enableFallback = this.config.get<boolean>('ai.enableFallback') ?? true;

    let sessionId: number | null = null;
    if (userId) {
      try {
        const session = await this.sessionRepo.createSession({
          userId,
          entryType: dto.entryType,
          providerUsed: primaryProvider,
          isFallback: false,
        });
        sessionId = session.id;
      } catch (err: any) {
        this.logger.warn(`Failed to pre-create recommendation session: ${err?.message}`);
      }
    }

    if (primaryProvider === 'google') {
      result = await this.tryProvider('google', prompt, enableFallback, sessionId ?? undefined);
    } else {
      result = await this.tryProvider('openrouter', prompt, enableFallback, sessionId ?? undefined);
    }

    let movies = await this.resolveMovies(
      result?.movieTmdbIds ?? [],
      userContext?.watchedMovieIds ?? [],
      dto.genreId,
      lang,
    );

    if (movies.length < 3) {
      this.logger.log('AI result had too few local matches — supplementing with rule-based');
      const ruleResult = await this.ruleBased.getRecommendations({
        genreId: dto.genreId,
        seedMovieId: dto.seedMovieId,
        excludeMovieIds: userContext?.watchedMovieIds,
        scenarioKey: dto.scenarioKey,
        refinements: dto.refinements as Record<string, boolean> | undefined,
        limit: 8,
      });

      const ruleMovies = await this.resolveMovies(
        ruleResult.movieTmdbIds,
        userContext?.watchedMovieIds ?? [],
        dto.genreId,
        lang,
      );

      const existingIds = new Set(movies.map((m) => m.id));
      const supplementary = ruleMovies.filter((m) => !existingIds.has(m.id));
      movies = [...movies, ...supplementary].slice(0, 8);

      if (!result || movies.length === 0) {
        result = ruleResult;
      }
    }

    if (userId && result && sessionId) {
      try {
        await this.prisma.recommendationSession.update({
          where: { id: sessionId },
          data: { providerUsed: result.providerUsed, isFallback: result.isFallback },
        });

        const request = await this.sessionRepo.createRequest({
          sessionId,
          scenarioKey: dto.scenarioKey,
          moodInput: dto.moodInput,
          freeTextPrompt: dto.freeTextPrompt,
          genreId: dto.genreId,
          seedMovieId: dto.seedMovieId,
        });

        if (movies.length > 0) {
          await this.sessionRepo.createResults(request.id, movies);
        }
      } catch (err: any) {
        this.logger.warn(`Failed to persist recommendation session: ${err?.message}`);
      }
    }

    return {
      sessionId,
      explanation: result?.explanation ?? 'Movies selected for you.',
      providerUsed: result?.providerUsed ?? 'rule_based',
      isFallback: result?.isFallback ?? true,
      movies,
      refinementOptions: this.getRefinementOptions(dto),
    };
  }

  async getUserHistory(userId: number, lang = 'uk') {
    const sessions = await this.sessionRepo.getUserHistory(userId);
    const isEn = lang.startsWith('en');
    return sessions.map((s) => {
      const mappedRequests = s.requests.map((r) => {
        const mappedResults = r.results.map((res) => {
          if (!res.movie) return res;
          return {
            ...res,
            movie: {
              ...res.movie,
              title: (isEn && res.movie.titleEn) ? res.movie.titleEn : res.movie.title,
              posterPath: (isEn && res.movie.posterPathEn) ? res.movie.posterPathEn : res.movie.posterPath,
            },
          };
        });
        return {
          ...r,
          results: mappedResults,
        };
      });
      return {
        ...s,
        requests: mappedRequests,
      };
    });
  }

  async getSessionDetail(sessionId: number, userId: number, lang = 'uk') {
    const session = await this.sessionRepo.getSessionDetail(sessionId, userId);
    if (!session) return null;
    const isEn = lang.startsWith('en');
    const mappedRequests = session.requests.map((r) => {
      const mappedResults = r.results.map((res) => {
        if (!res.movie) return res;
        return {
          ...res,
          movie: {
            ...res.movie,
            title: (isEn && res.movie.titleEn) ? res.movie.titleEn : res.movie.title,
            overview: (isEn && res.movie.overviewEn) ? res.movie.overviewEn : res.movie.overview,
            posterPath: (isEn && res.movie.posterPathEn) ? res.movie.posterPathEn : res.movie.posterPath,
            backdropPath: (isEn && res.movie.backdropPathEn) ? res.movie.backdropPathEn : res.movie.backdropPath,
          },
        };
      });
      return {
        ...r,
        results: mappedResults,
      };
    });
    return {
      ...session,
      requests: mappedRequests,
    };
  }


  private async tryProvider(
    provider: 'google' | 'openrouter',
    prompt: string,
    enableFallback: boolean,
    sessionId?: number,
  ): Promise<NormalizedRecommendationResult> {
    const primary = provider === 'google' ? this.google : this.openRouter;
    const secondary = provider === 'google' ? this.openRouter : this.google;

    const t0 = Date.now();
    try {
      const result = await primary.getRecommendations(prompt);
      if (sessionId) {
        this.sessionRepo
          .logAiProvider({ sessionId, provider, latencyMs: Date.now() - t0, status: 'success' })
          .catch((e: any) => this.logger.warn(`logAiProvider failed: ${e?.message}`));
      }
      return result;
    } catch (primaryErr: any) {
      this.logger.warn(`Primary provider (${provider}) failed: ${primaryErr?.message}`);
      if (sessionId) {
        this.sessionRepo
          .logAiProvider({ sessionId, provider, latencyMs: Date.now() - t0, status: 'error', errorMessage: primaryErr?.message })
          .catch((e: any) => this.logger.warn(`logAiProvider failed: ${e?.message}`));
      }

      if (enableFallback) {
        const secondaryName = provider === 'google' ? 'openrouter' : 'google';
        this.logger.log(`Trying secondary provider: ${secondaryName}`);
        const t1 = Date.now();
        try {
          const result = await secondary.getRecommendations(prompt);
          if (sessionId) {
            this.sessionRepo
              .logAiProvider({ sessionId, provider: secondaryName, latencyMs: Date.now() - t1, status: 'success' })
              .catch((e: any) => this.logger.warn(`logAiProvider failed: ${e?.message}`));
          }
          return result;
        } catch (secondaryErr: any) {
          this.logger.warn(`Secondary provider failed: ${secondaryErr?.message}`);
          if (sessionId) {
            this.sessionRepo
              .logAiProvider({ sessionId, provider: secondaryName, latencyMs: Date.now() - t1, status: 'error', errorMessage: secondaryErr?.message })
              .catch((e: any) => this.logger.warn(`logAiProvider failed: ${e?.message}`));
          }
        }
      }

      this.logger.log('All AI providers failed — using rule-based fallback');
      return this.ruleBased.getRecommendations({
        scenarioKey: undefined,
        limit: 8,
      });
    }
  }

  private async resolveMovies(
    tmdbIds: number[],
    excludeWatchedIds: number[],
    genreId?: number,
    lang = 'uk',
  ): Promise<RecommendationMovieCard[]> {
    if (!tmdbIds.length) return [];

    const movies = await this.prisma.movie.findMany({
      where: {
        tmdbId: { in: tmdbIds },
        id: excludeWatchedIds.length > 0 ? { notIn: excludeWatchedIds } : undefined,
      },
      include: {
        genres: {
          include: { genre: true },
        },
      },
    });

    const movieMap = new Map(movies.map((m) => [m.tmdbId, m]));
    return tmdbIds
      .map((tmdbId) => movieMap.get(tmdbId))
      .filter(Boolean)
      .map((m) => ({
        id: m!.id,
        tmdbId: m!.tmdbId,
        title: (lang.startsWith('en') && m!.titleEn) ? m!.titleEn : m!.title,
        overview: (lang.startsWith('en') && m!.overviewEn) ? m!.overviewEn : m!.overview,
        posterPath: (lang.startsWith('en') && m!.posterPathEn) ? m!.posterPathEn : m!.posterPath,
        backdropPath: (lang.startsWith('en') && m!.backdropPathEn) ? m!.backdropPathEn : m!.backdropPath,
        voteAverage: m!.voteAverage,
        releaseDate: m!.releaseDate?.toISOString().split('T')[0] ?? null,
        genres: m!.genres.map((mg) => ({ id: mg.genre.id, name: mg.genre.name })),
      })) as RecommendationMovieCard[];
  }

  private async resolveUserContext(userId: number) {
    const [watched, preferences] = await Promise.all([
      this.prisma.watchedMovie.findMany({
        where: { userId },
        select: { movieId: true },
      }),
      this.prisma.userPreference.findMany({
        where: { userId, weight: { gte: 0.5 } },
        include: { genre: true },
        orderBy: { weight: 'desc' },
        take: 5,
      }),
    ]);

    return {
      watchedMovieIds: watched.map((w) => w.movieId),
      favoriteGenreNames: preferences.map((p) => p.genre.name),
    };
  }

  private getRefinementOptions(dto: CreateRecommendationDto): string[] {
    const base = ['lighter', 'darker', 'newer', 'more_serious', 'less_romantic'];
    const applied = Object.entries(dto.refinements ?? {})
      .filter(([, v]) => v)
      .map(([k]) => k);
    return base.filter((r) => !applied.includes(r));
  }
}
