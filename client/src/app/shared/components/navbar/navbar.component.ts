import { Component, inject, signal, HostListener } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [RouterLink, RouterLinkActive, TranslateModule, CommonModule],
  template: `
    <header class="navbar">
      <div class="logo" routerLink="/">CineMatch</div>
      <nav class="nav-links">
        <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{exact: true}">
          {{ 'NAV.HOME' | translate }}
        </a>
        <a routerLink="/catalog" routerLinkActive="active">
          {{ 'NAV.CATALOG' | translate }}
        </a>
        @if (authState.isAuthenticated()) {
          <a routerLink="/recommendations" routerLinkActive="active">
            {{ 'NAV.RECOMMENDATIONS' | translate }}
          </a>
          @if (authState.isAdmin()) {
            <a routerLink="/admin" class="admin-badge" routerLinkActive="active">
              {{ 'NAV.ADMIN' | translate }}
            </a>
          }
        }
      </nav>
      <div class="auth-buttons">
        <div class="lang-switch">
          <button (click)="changeLang('uk')" [class.active]="currentLang() === 'uk'">UA</button>
          <span class="lang-separator">|</span>
          <button (click)="changeLang('en')" [class.active]="currentLang() === 'en'">EN</button>
        </div>

        @if (authState.isAuthenticated()) {
          <div class="user-menu-container">
            <div class="avatar-circle" (click)="toggleDropdown($event)">
              {{ userInitials() }}
            </div>
            
            <div class="dropdown-menu" *ngIf="dropdownOpen()" (click)="$event.stopPropagation()">
              <div class="dropdown-header">
                <span class="header-name">{{ authState.currentUser()?.name }}</span>
                <span class="header-email">{{ authState.currentUser()?.email }}</span>
              </div>
              <div class="dropdown-divider"></div>
              <a routerLink="/profile" class="dropdown-item" (click)="dropdownOpen.set(false)">
                👤 {{ 'NAV.PROFILE' | translate }}
              </a>
              <a routerLink="/recommendations" class="dropdown-item" (click)="dropdownOpen.set(false)">
                🔮 {{ 'NAV.RECOMMENDATIONS' | translate }}
              </a>
              @if (authState.isAdmin()) {
                <a routerLink="/admin" class="dropdown-item admin-item" (click)="dropdownOpen.set(false)">
                  ⚙️ {{ 'NAV.ADMIN' | translate }}
                </a>
              }
              <div class="dropdown-divider"></div>
              <button (click)="logout(); dropdownOpen.set(false)" class="dropdown-item logout-item">
                🚪 {{ 'NAV.LOGOUT' | translate }}
              </button>
            </div>
          </div>
        } @else {
          <a routerLink="/auth/login" class="btn-login">{{ 'NAV.LOGIN' | translate }}</a>
          <a routerLink="/auth/register" class="btn-register">{{ 'NAV.REGISTER' | translate }}</a>
        }
      </div>
    </header>
  `,
  styles: [`
    .navbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px 40px;
      background: rgba(15, 15, 21, 0.85);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      position: sticky;
      top: 0;
      z-index: 1000;
    }

    .logo {
      font-size: 24px;
      font-weight: 800;
      background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      letter-spacing: -0.5px;
      cursor: pointer;
    }

    .nav-links {
      display: flex;
      gap: 30px;
    }

    .nav-links a {
      color: #a0aec0;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
      font-size: 15px;
    }

    .nav-links a:hover, .nav-links a.active {
      color: #ffffff;
    }

    .admin-badge {
      background: rgba(255, 8, 68, 0.15);
      color: #ff0844 !important;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
      border: 1px solid rgba(255, 8, 68, 0.3);
    }

    .auth-buttons {
      display: flex;
      align-items: center;
      gap: 20px;
    }

    .lang-switch {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-right: 10px;
      font-size: 13px;
    }

    .lang-switch button {
      background: transparent;
      border: none;
      color: #718096;
      cursor: pointer;
      font-weight: 700;
      padding: 2px 4px;
      transition: color 0.2s ease;
    }

    .lang-switch button:hover, .lang-switch button.active {
      color: #ff0844;
    }

    .lang-separator {
      color: rgba(255, 255, 255, 0.15);
    }

    .btn-login, .btn-register {
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      text-decoration: none;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-login {
      color: #ffffff;
      background: transparent;
      border: none;
    }

    .btn-login:hover {
      color: #ff0844;
    }

    .btn-register {
      background: #ff0844;
      color: #ffffff;
      border: none;
      box-shadow: 0 4px 12px rgba(255, 8, 68, 0.2);
    }

    .btn-register:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(255, 8, 68, 0.3);
    }

    .user-menu-container {
      position: relative;
      display: inline-block;
    }

    .avatar-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(255, 8, 68, 0.2);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      user-select: none;
    }

    .avatar-circle:hover {
      transform: scale(1.05);
      box-shadow: 0 6px 14px rgba(255, 8, 68, 0.3);
    }

    .dropdown-menu {
      position: absolute;
      top: 48px;
      right: 0;
      width: 220px;
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
      padding: 8px 0;
      z-index: 1000;
      animation: fadeInDropdown 0.2s ease;
    }

    @keyframes fadeInDropdown {
      from { opacity: 0; transform: translateY(5px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .dropdown-header {
      padding: 10px 16px;
      display: flex;
      flex-direction: column;
    }

    .header-name {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
    }

    .header-email {
      font-size: 12px;
      color: #718096;
      margin-top: 2px;
    }

    .dropdown-divider {
      height: 1px;
      background: rgba(255, 255, 255, 0.05);
      margin: 8px 0;
    }

    .dropdown-item {
      display: flex;
      align-items: center;
      width: 100%;
      padding: 10px 16px;
      color: #a0aec0;
      text-decoration: none;
      font-size: 14px;
      font-weight: 500;
      background: transparent;
      border: none;
      text-align: left;
      cursor: pointer;
      transition: all 0.15s ease;
    }

    .dropdown-item:hover {
      background: rgba(255, 255, 255, 0.03);
      color: #ffffff;
    }

    .admin-item {
      color: #ff0844;
    }

    .admin-item:hover {
      color: #ff0844;
      background: rgba(255, 8, 68, 0.05);
    }

    .logout-item:hover {
      background: rgba(255, 8, 68, 0.05);
      color: #ff0844;
    }

    @media (max-width: 768px) {
      .navbar {
        padding: 15px 20px;
        flex-direction: column;
        gap: 15px;
        position: static;
      }
      .nav-links {
        gap: 15px;
        flex-wrap: wrap;
        justify-content: center;
      }
      .auth-buttons {
        width: 100%;
        justify-content: center;
        flex-wrap: wrap;
        gap: 12px;
      }
      .lang-switch {
        margin-right: 0;
        width: 100%;
        justify-content: center;
        margin-bottom: 5px;
      }
    }
  `]
})
export class NavbarComponent {
  readonly authState = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly translate = inject(TranslateService);

  readonly currentLang = signal<string>(localStorage.getItem('lang') || 'uk');
  readonly dropdownOpen = signal<boolean>(false);

  @HostListener('document:click')
  closeDropdown() {
    this.dropdownOpen.set(false);
  }

  toggleDropdown(event: Event) {
    event.stopPropagation();
    this.dropdownOpen.update(v => !v);
  }

  changeLang(lang: string) {
    localStorage.setItem('lang', lang);
    this.translate.use(lang);
    this.currentLang.set(lang);
  }

  userInitials(): string {
    const name = this.authState.currentUser()?.name || '';
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name[0].toUpperCase();
  }

  logout() {
    this.authService.logout();
  }
}
