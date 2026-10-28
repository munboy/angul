import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NormalizedRecommendationResult } from '../dto/recommendation-response.dto';

interface RuleBasedInput {
  genreId?: number;
  seedMovieId?: number;
  excludeMovieIds?: number[];
  moodInput?: string;
  scenarioKey?: string;
  freeTextPrompt?: string;
  refinements?: Record<string, boolean>;
  limit?: number;
}

@Injectable()
export class RuleBasedRecommenderService {
  private readonly logger = new Logger(RuleBasedRecommenderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getRecommendations(input: RuleBasedInput): Promise<NormalizedRecommendationResult> {
    const limit = input.limit ?? 8;
    const excludeIds = input.excludeMovieIds ?? [];

    const scenarioGenreHints: Record<string, string[]> = {
      something_light: ['Comedy', 'Animation', 'Family'],
      something_intense: ['Thriller', 'Action', 'Crime'],
      watch_with_friends: ['Comedy', 'Action', 'Adventure'],
      new_scifi: ['Science Fiction'],
      no_horror: [],
      not_sure: [],
      warm_romance: ['Romance', 'Drama'],
      tense_thriller: ['Thriller', 'Mystery'],
    };

    const excludeGenreHints: Record<string, string[]> = {
      no_horror: ['Horror'],
      not_sure: [],
    };

    let genreIds: number[] = [];
    if (input.genreId) {
      genreIds = [input.genreId];
    } else if (input.scenarioKey && scenarioGenreHints[input.scenarioKey]?.length) {
      const genreNames = scenarioGenreHints[input.scenarioKey];
      const genres = await this.prisma.genre.findMany({
        where: { name: { in: genreNames } },
      });
      genreIds = genres.map((g) => g.id);
    }

    let excludeGenreIds: number[] = [];
    if (input.scenarioKey && excludeGenreHints[input.scenarioKey]?.length) {
      const excludeNames = excludeGenreHints[input.scenarioKey];
      const excludedGenres = await this.prisma.genre.findMany({
        where: { name: { in: excludeNames } },
      });
      excludeGenreIds = excludedGenres.map((g) => g.id);
    }

    const orderBy: any = input.refinements?.newer
      ? [{ releaseDate: 'desc' }, { popularity: 'desc' }]
      : [{ popularity: 'desc' }, { voteAverage: 'desc' }];

    const movies = await this.prisma.movie.findMany({
      where: {
        AND: [
          excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {},
          genreIds.length > 0
            ? { genres: { some: { genreId: { in: genreIds } } } }
            : {},
          excludeGenreIds.length > 0
            ? { genres: { none: { genreId: { in: excludeGenreIds } } } }
            : {},
          { posterPath: { not: null } },
          { voteCount: { gte: 10 } },
        ],
      },
      orderBy,
      take: limit,
    });

    const explanation = this.buildExplanation(input, movies.length);

    this.logger.log(
      `Rule-based fallback returned ${movies.length} movies (scenario: ${input.scenarioKey ?? 'none'})`,
    );

    return {
      movieTmdbIds: movies.map((m) => m.tmdbId),
      explanation,
      providerUsed: 'rule_based',
      isFallback: true,
    };
  }

  private buildExplanation(input: RuleBasedInput, count: number): string {
    if (count === 0) {
      return 'We could not find exact matches. Try broadening your preferences.';
    }

    const scenarioExplanations: Record<string, string> = {
      something_light: `Selected ${count} light and fun movies — great for a relaxed evening.`,
      something_intense: `${count} gripping, high-energy picks chosen for intensity.`,
      watch_with_friends: `${count} crowd-pleasing movies perfect for a group watch.`,
      new_scifi: `${count} science fiction picks selected from the catalog.`,
      no_horror: `${count} movies selected — horror excluded as requested.`,
      not_sure: `${count} popular movies to help you decide what to watch.`,
      warm_romance: `${count} warm and romantic movies selected.`,
      tense_thriller: `${count} tense thriller picks without horror elements.`,
    };

    if (input.scenarioKey && scenarioExplanations[input.scenarioKey]) {
      return scenarioExplanations[input.scenarioKey];
    }

    if (input.freeTextPrompt) {
      return `${count} movies selected based on your request using catalog filters.`;
    }

    return `${count} movies selected based on your preferences.`;
  }
}
