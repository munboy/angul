export interface RecommendationMovieCard {
  id: number;
  tmdbId: number;
  title: string;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  voteAverage: number;
  releaseDate: string | null;
  genres: { id: number; name: string }[];
  explanation?: string;
}

export interface NormalizedRecommendationResult {
  movieTmdbIds: number[];
  explanation: string;
  providerUsed: 'google' | 'openrouter' | 'rule_based';
  isFallback: boolean;
}

export class RecommendationResponseDto {
  sessionId: number | null; 
  explanation: string;
  providerUsed: 'google' | 'openrouter' | 'rule_based';
  isFallback: boolean;
  movies: RecommendationMovieCard[];
  refinementOptions: string[];
}
