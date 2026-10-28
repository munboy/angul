import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationMovieCard } from './dto/recommendation-response.dto';

@Injectable()
export class RecommendationSessionRepository {
  private readonly logger = new Logger(RecommendationSessionRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async createSession(data: {
    userId: number;
    entryType: string;
    providerUsed: string;
    isFallback: boolean;
  }) {
    return this.prisma.recommendationSession.create({
      data: {
        userId: data.userId,
        entryType: data.entryType,
        status: 'completed',
        providerUsed: data.providerUsed,
        isFallback: data.isFallback,
      },
    });
  }

  async createRequest(data: {
    sessionId: number;
    scenarioKey?: string;
    moodInput?: string;
    freeTextPrompt?: string;
    genreId?: number;
    seedMovieId?: number;
  }) {
    return this.prisma.recommendationRequest.create({
      data: {
        sessionId: data.sessionId,
        scenarioKey: data.scenarioKey,
        moodInput: data.moodInput,
        freeTextPrompt: data.freeTextPrompt,
        genreId: data.genreId,
        seedMovieId: data.seedMovieId,
      },
    });
  }

  async createResults(requestId: number, movies: RecommendationMovieCard[]) {
    const data = movies.map((movie, index) => ({
      requestId,
      movieId: movie.id,
      explanation: movie.explanation ?? null,
      position: index + 1,
    }));

    return this.prisma.recommendationResult.createMany({ data });
  }

  async logAiProvider(data: {
    sessionId: number;
    provider: string;
    latencyMs?: number;
    status: string;
    errorMessage?: string;
  }) {
    return this.prisma.aiProviderLog.create({
      data: {
        sessionId: data.sessionId,
        provider: data.provider,
        latencyMs: data.latencyMs,
        status: data.status,
        errorMessage: data.errorMessage,
      },
    });
  }

  async getUserHistory(userId: number) {
    return this.prisma.recommendationSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        requests: {
          include: {
            results: {
              include: {
                movie: {
                  select: {
                    id: true,
                    title: true,
                    titleEn: true,
                    posterPath: true,
                    posterPathEn: true,
                  },
                },
              },
              orderBy: { position: 'asc' },
              take: 4,
            },
          },
          take: 1,
        },
      },
    });
  }

  async getSessionDetail(sessionId: number, userId: number) {
    return this.prisma.recommendationSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        requests: {
          include: {
            results: {
              include: {
                movie: true,
              },
              orderBy: { position: 'asc' },
            },
          },
        },
      },
    });
  }
}
