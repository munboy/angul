import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Genre {
  id: number;
  tmdbId: number;
  name: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterState {
  q?: string;
  genreId?: number;
  year?: number;
  minRating?: number;
  excludeWatched?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  getGenres(): Observable<{ success: boolean; data: Genre[] }> {
    return this.http.get<{ success: boolean; data: Genre[] }>(`${this.baseUrl}/genres`);
  }

  searchMovies(filters: {
    q?: string;
    genreId?: number;
    year?: number;
    minRating?: number;
    page?: number;
    limit?: number;
    excludeWatched?: boolean;
  }): Observable<{ success: boolean; data: PaginatedResult<any> }> {
    let params = new HttpParams();

    if (filters.q) params = params.set('q', filters.q);
    if (filters.genreId) params = params.set('genreId', filters.genreId.toString());
    if (filters.year) params = params.set('year', filters.year.toString());
    if (filters.minRating !== undefined && filters.minRating !== null) {
      params = params.set('minRating', filters.minRating.toString());
    }
    if (filters.page) params = params.set('page', filters.page.toString());
    if (filters.limit) params = params.set('limit', filters.limit.toString());
    if (filters.excludeWatched !== undefined) {
      params = params.set('excludeWatched', filters.excludeWatched.toString());
    }

    return this.http.get<{ success: boolean; data: PaginatedResult<any> }>(`${this.baseUrl}/movies/search`, { params });
  }
}
