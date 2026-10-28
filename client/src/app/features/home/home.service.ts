import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MovieCard {
  id: number;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  backdropPath: string | null;
  overview: string | null;
  releaseDate: string | null;
  voteAverage: number;
  genres: { id: number; name: string }[];
  isFavorite: boolean;
  isWatched: boolean;
}

export interface RailsData {
  newReleases: MovieCard[];
  popular: MovieCard[];
  byGenre: {
    genre: { id: number; name: string };
    movies: MovieCard[];
  }[];
  personalized?: MovieCard[];
}

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  private readonly apiUrl = `${environment.apiUrl}/movies/rails`;

  constructor(private readonly http: HttpClient) {}

  getRails(): Observable<{ success: boolean; data: RailsData }> {
    return this.http.get<{ success: boolean; data: RailsData }>(this.apiUrl);
  }
}
