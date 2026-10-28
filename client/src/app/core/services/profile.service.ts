import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PreferenceDto {
  genreId: number;
  genreName: string;
  weight: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileService {
  private readonly apiUrl = `${environment.apiUrl}/profile`;

  constructor(private readonly http: HttpClient) {}

  getPreferences(): Observable<{ success: boolean; data: PreferenceDto[] }> {
    return this.http.get<{ success: boolean; data: PreferenceDto[] }>(`${this.apiUrl}/preferences`);
  }

  updatePreferences(genreIds: number[]): Observable<{ success: boolean; data: PreferenceDto[] }> {
    return this.http.put<{ success: boolean; data: PreferenceDto[] }>(`${this.apiUrl}/preferences`, { genreIds });
  }
}
