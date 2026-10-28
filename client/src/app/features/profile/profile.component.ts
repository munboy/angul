import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthStateService } from '../../core/services/auth-state.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { WatchedService } from '../../core/services/watched.service';
import { ProfileService, PreferenceDto } from '../../core/services/profile.service';
import { CatalogService, Genre } from '../catalog/catalog.service';
import { RecommendationService, HistorySession } from '../../core/services/recommendation.service';
import { Subscription } from 'rxjs';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TmdbImagePipe } from '../../shared/pipes/tmdb-image.pipe';

type ProfileTab = 'favorites' | 'watched' | 'preferences' | 'history';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NavbarComponent,
    MovieCardComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    TmdbImagePipe,
  ],
  template: `
    <div class="profile-container">
      <app-navbar></app-navbar>

      <main class="profile-content">
        <div class="profile-header">
          <div class="avatar-circle">
            {{ userInitials() }}
          </div>
          <div class="bio-info">
            <h1 class="user-name">{{ authState.currentUser()?.name }}</h1>
            <p class="user-email">✉️ {{ authState.currentUser()?.email }}</p>
            <span class="role-badge">{{ authState.currentUser()?.role }}</span>
          </div>
        </div>

        <div class="tabs-nav">
          <button 
            (click)="setTab('favorites')" 
            [class.active]="activeTab() === 'favorites'"
            class="tab-btn"
          >
            ⭐ {{ 'PROFILE.TAB_FAVORITES' | translate }}
          </button>
          <button 
            (click)="setTab('watched')" 
            [class.active]="activeTab() === 'watched'"
            class="tab-btn"
          >
            👁️ {{ 'PROFILE.TAB_WATCHED' | translate }}
          </button>
          <button 
            (click)="setTab('preferences')" 
            [class.active]="activeTab() === 'preferences'"
            class="tab-btn"
          >
            ⚙️ {{ 'PROFILE.TAB_PREFERENCES' | translate }}
          </button>
          <button 
            (click)="setTab('history')" 
            [class.active]="activeTab() === 'history'"
            class="tab-btn"
          >
            🔮 {{ 'PROFILE.TAB_HISTORY' | translate }}
          </button>
        </div>

        <div class="loading-wrapper" *ngIf="loading()">
          <app-skeleton-loader type="grid"></app-skeleton-loader>
        </div>

        <div class="tab-content" *ngIf="!loading()">
          
          <ng-container *ngIf="activeTab() === 'favorites'">
            <app-empty-state
              *ngIf="favorites().length === 0"
              icon="⭐"
              title="PROFILE.NO_FAVS_TITLE"
              description="PROFILE.NO_FAVS_DESC"
            ></app-empty-state>

            <div class="movies-grid" *ngIf="favorites().length > 0">
              <div *ngFor="let movie of favorites()">
                <app-movie-card [movie]="movie"></app-movie-card>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="activeTab() === 'watched'">
            <app-empty-state
              *ngIf="watched().length === 0"
              icon="👁️"
              title="PROFILE.NO_WATCHED_TITLE"
              description="PROFILE.NO_WATCHED_DESC"
            ></app-empty-state>

            <div class="movies-grid" *ngIf="watched().length > 0">
              <div *ngFor="let movie of watched()">
                <app-movie-card [movie]="movie"></app-movie-card>
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="activeTab() === 'preferences'">
            <div class="preferences-box">
              <h3 class="pref-title">{{ 'PROFILE.PREF_TITLE' | translate }}</h3>
              <p class="pref-desc">{{ 'PROFILE.PREF_DESC' | translate }}</p>

              <div class="genres-checklist">
                <div class="checklist-item" *ngFor="let genre of allGenres()">
                  <label class="checkbox-container">
                    <input 
                      type="checkbox" 
                      [checked]="isGenrePreferred(genre.id)"
                      (change)="toggleGenrePreference(genre.id, $event)"
                    />
                    <span class="checkmark"></span>
                    <span class="genre-name">{{ genre.name }}</span>
                  </label>
                </div>
              </div>

              <div class="save-indicator" [class.show]="showSavedIndicator()">
                ✓ {{ 'PROFILE.PREFERENCES_SAVED' | translate }}
              </div>
            </div>
          </ng-container>

          <ng-container *ngIf="activeTab() === 'history'">
            <app-empty-state
              *ngIf="history().length === 0"
              icon="🔮"
              title="PROFILE.NO_HISTORY_TITLE"
              description="PROFILE.NO_HISTORY_DESC"
            ></app-empty-state>

            <div class="history-tab-list" *ngIf="history().length > 0">
              <div class="history-item-row" *ngFor="let session of history()">
                <div class="history-item-info">
                  <div class="history-item-header">
                    <span class="history-badge">{{ formatEntryType(session.entryType) | translate }}</span>
                    <span class="history-time">📅 {{ session.createdAt | date:'medium' }}</span>
                  </div>
                  
                  <div class="history-query-summary" *ngIf="getQuerySummary(session)">
                    {{ 'PROFILE.QUERY' | translate }}: <em>"{{ getQuerySummary(session) }}"</em>
                  </div>

                  <div class="history-movie-thumbs">
                    <div class="thumb-wrapper" *ngFor="let result of session.requests[0]?.results">
                      <img
                        [src]="result.movie.posterPath | tmdbImage:'w92'"
                        [alt]="result.movie.title"
                        class="history-thumb-img"
                        (error)="onPosterError($event)"
                      />
                      <span class="thumb-title">{{ result.movie.title }}</span>
                    </div>
                  </div>
                </div>
                
                <div class="history-item-actions">
                  <button class="btn-rerun" (click)="rerunSession(session)">
                    🚀 {{ 'PROFILE.RERUN_BUTTON' | translate }}
                  </button>
                </div>
              </div>
            </div>
          </ng-container>

        </div>
      </main>
    </div>
  `,
  styles: [`
    .profile-container {
      min-height: 100vh;
      background: #0f0f15;
      color: #ffffff;
      font-family: 'Outfit', 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }

    .profile-content {
      flex: 1;
      padding: 40px;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
    }

    .profile-header {
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 30px;
      display: flex;
      gap: 30px;
      align-items: center;
      margin-bottom: 40px;
    }

    .avatar-circle {
      width: 90px;
      height: 90px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
      color: #ffffff;
      font-size: 32px;
      font-weight: 800;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 15px rgba(255, 8, 68, 0.3);
    }

    .bio-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .user-name {
      font-size: 28px;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.5px;
    }

    .user-email {
      font-size: 14px;
      color: #a0aec0;
      margin: 0;
    }

    .role-badge {
      display: inline-block;
      align-self: flex-start;
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #e2e8f0;
      margin-top: 6px;
    }

    .tabs-nav {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 15px;
      margin-bottom: 30px;
    }

    .tab-btn {
      padding: 10px 24px;
      background: transparent;
      border: none;
      color: #718096;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
    }

    .tab-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.02);
    }

    .tab-btn.active {
      color: #ffffff;
      background: #181825;
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.03);
    }

    .loading-wrapper {
      padding-top: 40px;
    }

    .movies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 30px;
    }

    .preferences-box {
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 30px;
      max-width: 800px;
      position: relative;
    }

    .pref-title {
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 8px;
    }

    .pref-desc {
      font-size: 14px;
      color: #a0aec0;
      margin-bottom: 30px;
      line-height: 1.5;
    }

    .genres-checklist {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
      gap: 16px;
    }

    .checkbox-container {
      display: flex;
      align-items: center;
      position: relative;
      padding-left: 35px;
      margin-bottom: 12px;
      cursor: pointer;
      font-size: 16px;
      user-select: none;
    }

    .checkbox-container input {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkmark {
      position: absolute;
      top: 0;
      left: 0;
      height: 24px;
      width: 24px;
      background-color: #0f0f15;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      transition: all 0.2s ease;
    }

    .checkbox-container:hover input ~ .checkmark {
      border-color: #ff0844;
    }

    .checkbox-container input:checked ~ .checkmark {
      background-color: #ff0844;
      border-color: #ff0844;
    }

    .checkmark:after {
      content: "";
      position: absolute;
      display: none;
    }

    .checkbox-container input:checked ~ .checkmark:after {
      display: block;
    }

    .checkbox-container .checkmark:after {
      left: 9px;
      top: 5px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .genre-name {
      font-size: 15px;
      font-weight: 500;
      color: #e2e8f0;
    }

    .save-indicator {
      position: absolute;
      bottom: 30px;
      right: 30px;
      background: rgba(46, 196, 182, 0.1);
      border: 1px solid #2ec4b6;
      color: #2ec4b6;
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 700;
      opacity: 0;
      transform: translateY(5px);
      transition: all 0.3s ease;
    }

    .save-indicator.show {
      opacity: 1;
      transform: translateY(0);
    }

    .history-tab-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
      max-width: 800px;
    }

    .history-item-row {
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .history-item-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .history-item-header {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .history-badge {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 8, 68, 0.1);
      border: 1px solid #ff0844;
      color: #ff0844;
    }

    .history-time {
      font-size: 13px;
      color: #718096;
    }

    .history-query-summary {
      font-size: 14px;
      color: #cbd5e0;
      line-height: 1.4;
    }

    .history-movie-thumbs {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
    }

    .thumb-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 68px;
      text-align: center;
    }

    .history-thumb-img {
      width: 60px;
      height: 90px;
      object-fit: cover;
      border-radius: 6px;
      border: 1px solid rgba(255, 255, 255, 0.05);
      box-shadow: 0 4px 6px rgba(0,0,0,0.2);
    }

    .thumb-title {
      font-size: 10px;
      color: #a0aec0;
      margin-top: 4px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      width: 100%;
    }

    .history-item-actions {
      display: flex;
      align-items: center;
    }

    .btn-rerun {
      padding: 10px 18px;
      background: #ff0844;
      color: #ffffff;
      font-weight: 700;
      font-size: 13px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 0 4px 10px rgba(255, 8, 68, 0.2);
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .btn-rerun:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 14px rgba(255, 8, 68, 0.3);
    }

    @media (max-width: 768px) {
      .profile-content {
        padding: 20px;
      }
      .profile-header {
        flex-direction: column;
        text-align: center;
        padding: 20px;
      }
      .bio-info {
        align-items: center;
      }
      .tabs-nav {
        flex-wrap: wrap;
      }
      .tab-btn {
        flex: 1 1 auto;
        padding: 8px 16px;
        font-size: 14px;
      }
      .movies-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 16px;
      }
      .genres-checklist {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ProfileComponent implements OnInit, OnDestroy {
  readonly authState = inject(AuthStateService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly watchedService = inject(WatchedService);
  private readonly profileService = inject(ProfileService);
  private readonly catalogService = inject(CatalogService);
  private readonly recommendationService = inject(RecommendationService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly activeTab = signal<ProfileTab>('favorites');
  readonly loading = signal<boolean>(true);

  readonly favorites = signal<any[]>([]);
  readonly watched = signal<any[]>([]);
  readonly userPreferences = signal<PreferenceDto[]>([]);
  readonly allGenres = signal<Genre[]>([]);
  readonly history = signal<HistorySession[]>([]);

  readonly showSavedIndicator = signal<boolean>(false);
  private saveTimeout: any;

  private langChangeSub?: Subscription;

  ngOnInit() {
    this.loadAllData();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.loadAllData();
    });
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
  }

  loadAllData() {
    this.loading.set(true);

    this.catalogService.getGenres().subscribe({
      next: (genresRes) => {
        if (genresRes.success) {
          this.allGenres.set(genresRes.data);
        }
      }
    });

    this.favoritesService.getFavorites().subscribe({
      next: (res) => {
        if (res.success) {
          this.favorites.set(res.data);
        }
      }
    });

    this.watchedService.getWatched().subscribe({
      next: (res) => {
        if (res.success) {
          this.watched.set(res.data);
        }
      }
    });

    this.profileService.getPreferences().subscribe({
      next: (res) => {
        if (res.success) {
          this.userPreferences.set(res.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });

    if (this.authState.isAuthenticated()) {
      this.recommendationService.getHistory().subscribe({
        next: (res) => {
          if (res.success) {
            this.history.set(res.data);
          }
        }
      });
    }
  }

  setTab(tab: ProfileTab) {
    this.activeTab.set(tab);
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

  isGenrePreferred(genreId: number): boolean {
    return this.userPreferences().some(p => p.genreId === genreId);
  }

  toggleGenrePreference(genreId: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;
    const currentGenreIds = this.userPreferences().map(p => p.genreId);

    let updatedGenreIds: number[];
    if (isChecked) {
      updatedGenreIds = [...currentGenreIds, genreId];
    } else {
      updatedGenreIds = currentGenreIds.filter(id => id !== genreId);
    }

    this.profileService.updatePreferences(updatedGenreIds).subscribe({
      next: (res) => {
        if (res.success) {
          this.userPreferences.set(res.data);
          this.triggerSavedNotification();
        }
      }
    });
  }

  rerunSession(session: HistorySession) {
    const req = session.requests[0];
    if (!req) return;

    this.router.navigate(['/recommendations'], {
      state: {
        rerunRequest: {
          entryType: session.entryType,
          scenarioKey: req.scenarioKey ?? undefined,
          freeTextPrompt: req.freeTextPrompt ?? undefined,
        }
      }
    });
  }

  getQuerySummary(session: HistorySession): string {
    const req = session.requests[0];
    if (!req) return '';
    const parts: string[] = [];
    if (req.scenarioKey) {
      const scenarioMap: Record<string, string> = {
        not_sure: 'REC.SCENARIO.NOT_SURE',
        something_light: 'REC.SCENARIO.LIGHT',
        something_intense: 'REC.SCENARIO.INTENSE',
        watch_with_friends: 'REC.SCENARIO.FRIENDS',
        warm_romance: 'REC.SCENARIO.ROMANCE',
        tense_thriller: 'REC.SCENARIO.THRILLER',
        new_scifi: 'REC.SCENARIO.SCIFI',
        no_horror: 'REC.SCENARIO.NO_HORROR'
      };
      const scenarioLabel = scenarioMap[req.scenarioKey]
        ? this.translate.instant(scenarioMap[req.scenarioKey])
        : req.scenarioKey;
      parts.push(`${this.translate.instant('PROFILE.HISTORY_SCENARIO')}: ${scenarioLabel}`);
    }
    if (req.freeTextPrompt) {
      parts.push(req.freeTextPrompt);
    }
    return parts.join(' | ');
  }

  formatEntryType(type: string): string {
    const map: Record<string, string> = {
      quick_scenario: 'REC.ENTRY.QUICK_SCENARIO',
      guided: 'REC.ENTRY.GUIDED',
      free_text: 'REC.ENTRY.FREE_TEXT',
    };
    return map[type] ?? type;
  }

  onPosterError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'https://placehold.co/92x138/1a1a2e/6b7280?text=🎬';
    img.onerror = null;
  }

  private triggerSavedNotification() {
    this.showSavedIndicator.set(true);
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }
    this.saveTimeout = setTimeout(() => {
      this.showSavedIndicator.set(false);
    }, 2000);
  }
}
