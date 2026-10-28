import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface WatchedResponse {
  movieId: number;
  watchedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class WatchedService {
  private readonly apiUrl = `${environment.apiUrl}/profile/watched`;

  constructor(private readonly http: HttpClient) {}

  getWatched(): Observable<{ success: boolean; data: any[] }> {
    return this.http.get<{ success: boolean; data: any[] }>(this.apiUrl);
  }

  addWatched(movieId: number): Observable<{ success: boolean; data: WatchedResponse }> {
    return this.http.post<{ success: boolean; data: WatchedResponse }>(`${this.apiUrl}/${movieId}`, {});
  }

  removeWatched(movieId: number): Observable<{ success: boolean; data: { removed: boolean } }> {
    return this.http.delete<{ success: boolean; data: { removed: boolean } }>(`${this.apiUrl}/${movieId}`);
  }
}
