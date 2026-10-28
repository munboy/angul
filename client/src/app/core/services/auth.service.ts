import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AuthStateService, UserSummary } from './auth-state.service';

interface AuthResponse {
  accessToken: string;
  user: UserSummary;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = `${environment.apiUrl}/auth`;

  constructor(
    private readonly http: HttpClient,
    private readonly authStateService: AuthStateService
  ) {}

  register(name: string, email: string, password: string): Observable<{ success: boolean; data: AuthResponse }> {
    return this.http.post<{ success: boolean; data: AuthResponse }>(`${this.apiUrl}/register`, {
      name,
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.authStateService.setAuthState(response.data.user, response.data.accessToken);
        }
      })
    );
  }

  login(email: string, password: string): Observable<{ success: boolean; data: AuthResponse }> {
    return this.http.post<{ success: boolean; data: AuthResponse }>(`${this.apiUrl}/login`, {
      email,
      password
    }).pipe(
      tap(response => {
        if (response.success && response.data) {
          this.authStateService.setAuthState(response.data.user, response.data.accessToken);
        }
      })
    );
  }

  logout() {
    this.authStateService.clearAuthState();
  }
}
