import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MovieDetail {
  id: number;
  tmdbId: number;
  title: string;
  originalTitle: string | null;
  overview: string | null;
  posterPath: string | null;
  backdropPath: string | null;
  releaseDate: string | null;
  runtime: number | null;
  voteAverage: number;
  voteCount: number;
  genres: { id: number; name: string }[];
  isFavorite: boolean;
  isWatched: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class MovieDetailsService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getMovieDetails(id: number): Observable<{ success: boolean; data: MovieDetail }> {
    return this.http.get<{ success: boolean; data: MovieDetail }>(`${this.baseUrl}/movies/${id}`);
  }

  getSimilarMovies(id: number): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(`${this.baseUrl}/movies/${id}/similar`);
  }
}
