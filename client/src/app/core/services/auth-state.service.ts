import { Injectable, signal, computed } from '@angular/core';

export interface UserSummary {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthStateService {
  readonly currentUser = signal<UserSummary | null>(null);
  readonly token = signal<string | null>(null);

  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isAdmin = computed(() => this.currentUser()?.role === 'admin');

  constructor() {
    this.loadFromStorage();
  }

  setAuthState(user: UserSummary, token: string) {
    this.currentUser.set(user);
    this.token.set(token);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clearAuthState() {
    this.currentUser.set(null);
    this.token.set(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  private loadFromStorage() {
    const token = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');

    if (token && userStr && token !== 'undefined' && userStr !== 'undefined') {
      try {
        const user = JSON.parse(userStr) as UserSummary;
        this.currentUser.set(user);
        this.token.set(token);
      } catch (e) {
        this.clearAuthState();
      }
    } else {
      this.clearAuthState();
    }
  }
}
