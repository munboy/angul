import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface SyncJobResponse {
  id: number;
  type: string;
  status: string;
  itemsTotal: number;
  itemsProcessed: number;
  itemsFailed: number;
  startedAt: string;
  completedAt: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/admin`;

  triggerSync(type: 'popular' | 'now_playing'): Observable<{ success: boolean; data: SyncJobResponse }> {
    return this.http.post<{ success: boolean; data: SyncJobResponse }>(`${this.baseUrl}/sync/tmdb`, { type });
  }

  triggerSingleSync(tmdbId: number): Observable<{ success: boolean; data: any }> {
    return this.http.post<{ success: boolean; data: any }>(`${this.baseUrl}/sync/tmdb/${tmdbId}`, {});
  }

  getStats(): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/stats`);
  }

  getUsers(page = 1, limit = 20, search?: string): Observable<{ success: boolean; data: any }> {
    const params: any = { page: page.toString(), limit: limit.toString() };
    if (search && search.trim()) params.search = search.trim();
    return this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/users`, { params });
  }

  updateUserStatus(userId: number, isActive: boolean): Observable<{ success: boolean; data: any }> {
    return this.http.patch<{ success: boolean; data: any }>(`${this.baseUrl}/users/${userId}/status`, { isActive });
  }

  getSyncJobs(page = 1, limit = 10): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/sync-jobs`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }

  getLastSyncJob(): Observable<{ success: boolean; data: SyncJobResponse | null }> {
    return this.http.get<{ success: boolean; data: SyncJobResponse | null }>(`${this.baseUrl}/sync-jobs/last`);
  }

  getAiLogs(page = 1, limit = 10): Observable<{ success: boolean; data: any }> {
    return this.http.get<{ success: boolean; data: any }>(`${this.baseUrl}/ai-logs`, {
      params: { page: page.toString(), limit: limit.toString() }
    });
  }
}
