import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export type RecommendationEntryType = 'quick_scenario' | 'guided' | 'free_text';

export type ScenarioKey =
  | 'something_light'
  | 'something_intense'
  | 'watch_with_friends'
  | 'new_scifi'
  | 'no_horror'
  | 'not_sure'
  | 'warm_romance'
  | 'tense_thriller';

export interface CreateRecommendationRequest {
  entryType: RecommendationEntryType;
  scenarioKey?: string;
  moodInput?: string;
  freeTextPrompt?: string;
  genreId?: number;
  seedMovieId?: number;
  refinements?: {
    lighter?: boolean;
    darker?: boolean;
    newer?: boolean;
    moreSerious?: boolean;
    lessRomantic?: boolean;
  };
}

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

export interface RecommendationResponse {
  sessionId: number | null;
  explanation: string;
  providerUsed: 'google' | 'openrouter' | 'rule_based';
  isFallback: boolean;
  movies: RecommendationMovieCard[];
  refinementOptions: string[];
}

export interface HistorySession {
  id: number;
  entryType: string;
  status: string;
  providerUsed: string | null;
  isFallback: boolean;
  createdAt: string;
  requests: {
    id: number;
    scenarioKey: string | null;
    freeTextPrompt: string | null;
    results: {
      position: number;
      movie: { id: number; title: string; posterPath: string | null };
    }[];
  }[];
}

@Injectable({ providedIn: 'root' })
export class RecommendationService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/recommendations`;

  getRecommendations(
    req: CreateRecommendationRequest,
  ): Observable<{ success: boolean; data: RecommendationResponse }> {
    return this.http.post<{ success: boolean; data: RecommendationResponse }>(
      this.base,
      req,
    );
  }

  getHistory(): Observable<{ success: boolean; data: HistorySession[] }> {
    return this.http.get<{ success: boolean; data: HistorySession[] }>(
      `${this.base}/history`,
    );
  }
}
