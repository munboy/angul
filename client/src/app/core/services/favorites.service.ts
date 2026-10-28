import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface FavoriteResponse {
  movieId: number;
  favoritedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class FavoritesService {
  private readonly apiUrl = `${environment.apiUrl}/profile/favorites`;

  constructor(private readonly http: HttpClient) {}

  getFavorites(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(this.apiUrl);
  }

  addFavorite(movieId: number): Observable<{ success: boolean; data: FavoriteResponse }> {
    return this.http.post<{ success: boolean; data: FavoriteResponse }>(`${this.apiUrl}/${movieId}`, {});
  }

  removeFavorite(movieId: number): Observable<{ success: boolean; data: { removed: boolean } }> {
    return this.http.delete<{ success: boolean; data: { removed: boolean } }>(`${this.apiUrl}/${movieId}`);
  }
}
