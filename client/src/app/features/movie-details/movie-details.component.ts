import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { MovieDetailsService, MovieDetail } from './movie-details.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { WatchedService } from '../../core/services/watched.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { RailComponent } from '../../shared/components/rail/rail.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TmdbImagePipe } from '../../shared/pipes/tmdb-image.pipe';

@Component({
  selector: 'app-movie-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    TranslateModule,
    NavbarComponent,
    RailComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
    TmdbImagePipe
  ],
  template: `
    <div class="details-container">
      <app-navbar></app-navbar>

      <div class="loading-wrapper" *ngIf="loading()">
        <app-skeleton-loader type="card" class="detail-skeleton"></app-skeleton-loader>
        <div class="skeleton-info">
          <div class="skeleton-line shimmer h-32 w-300"></div>
          <div class="skeleton-line shimmer h-20 w-200"></div>
          <div class="skeleton-line shimmer h-100 w-full"></div>
        </div>
      </div>

      <app-empty-state
        *ngIf="error()"
        icon="⚠️"
        title="DETAILS.ERROR_TITLE"
        description="DETAILS.ERROR_DESC"
        [showAction]="true"
        actionText="COMMON.RETRY"
        (actionClicked)="loadMovieData(movieId)"
      ></app-empty-state>

      <ng-container *ngIf="!loading() && !error() && movie()">
        
        <div 
          class="backdrop-hero"
          [style.backgroundImage]="'linear-gradient(to top, #0f0f15 5%, rgba(15, 15, 21, 0.4) 100%), url(' + (movie()!.backdropPath | tmdbImage:'w1280') + ')'"
        >
          <div class="backdrop-content">
            <div class="movie-main-info">
              
              <div class="poster-box">
                <img 
                  [src]="movie()!.posterPath | tmdbImage:'w342'" 
                  [alt]="movie()!.title"
                  class="poster-img"
                />
              </div>

              <div class="meta-box">
                <h1 class="movie-title">{{ movie()!.title }}</h1>
                <p class="original-title" *ngIf="movie()!.originalTitle && movie()!.originalTitle !== movie()!.title">
                  {{ movie()!.originalTitle }}
                </p>

                <div class="meta-row">
                  <span class="rating">⭐ {{ movie()!.voteAverage | number:'1.1-1' }} <span class="votes">({{ movie()!.voteCount }})</span></span>
                  <span class="divider">|</span>
                  <span class="year">{{ movie()!.releaseDate ? (movie()!.releaseDate | date:'yyyy') : 'N/A' }}</span>
                  <span class="divider" *ngIf="movie()!.runtime">|</span>
                  <span class="runtime" *ngIf="movie()!.runtime">{{ formatRuntime(movie()!.runtime) }}</span>
                </div>

                <div class="genres">
                  <span *ngFor="let g of movie()!.genres" class="genre-tag">{{ g.name }}</span>
                </div>

                <div class="action-buttons">
                  @if (authState.isAuthenticated()) {
                    <button (click)="toggleFavorite()" [class.active]="isFav()" class="btn-action fav">
                      {{ (isFav() ? 'DETAILS.REMOVE_FAV' : 'DETAILS.ADD_FAV') | translate }}
                    </button>
                    <button (click)="toggleWatched()" [class.active]="isWatched()" class="btn-action watch">
                      {{ (isWatched() ? 'DETAILS.REMOVE_WATCHED' : 'DETAILS.ADD_WATCHED') | translate }}
                    </button>
                    <button (click)="aiSimilar()" class="btn-action ai-match">
                      🤖 {{ 'DETAILS.AI_SIMILAR' | translate }}
                    </button>
                  } @else {
                    <div class="guest-notice">
                      🔒 {{ 'DETAILS.LOGIN_NOTICE' | translate }}
                    </div>
                  }
                </div>

              </div>

            </div>
          </div>
        </div>

        <div class="overview-section">
          <h3 class="section-heading">{{ 'DETAILS.SYNOPSIS' | translate }}</h3>
          <p class="synopsis">{{ movie()!.overview || ('DETAILS.NO_OVERVIEW' | translate) }}</p>
        </div>

        <div class="similar-section" *ngIf="similar().length > 0">
          <app-rail
            [title]="'DETAILS.SIMILAR_TITLE'"
            [translateTitle]="true"
            [movies]="similar()"
          ></app-rail>
        </div>

      </ng-container>
    </div>
  `,
  styles: [`
    .details-container {
      min-height: 100vh;
      background: #0f0f15;
      color: #ffffff;
      font-family: 'Outfit', 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }

    .loading-wrapper {
      display: flex;
      padding: 60px 80px;
      gap: 40px;
    }

    .detail-skeleton {
      width: 250px;
      height: 375px;
      border-radius: 12px;
    }

    .skeleton-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 20px;
      justify-content: center;
    }

    .skeleton-line {
      background: #1e1e2d;
      border-radius: 4px;
    }

    .h-32 { height: 32px; }
    .h-20 { height: 20px; }
    .h-100 { height: 100px; }
    .w-300 { width: 300px; }
    .w-200 { width: 200px; }
    .w-full { width: 100%; }

    .backdrop-hero {
      background-size: cover;
      background-position: center 15%;
      min-height: 60vh;
      display: flex;
      align-items: flex-end;
      position: relative;
    }

    .backdrop-content {
      width: 100%;
      background: linear-gradient(to top, #0f0f15 0%, rgba(15, 15, 21, 0.6) 80%, rgba(15, 15, 21, 0.2) 100%);
      padding: 40px 80px;
    }

    .movie-main-info {
      display: flex;
      gap: 40px;
      align-items: flex-end;
    }

    .poster-box {
      width: 230px;
      flex-shrink: 0;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .meta-box {
      flex: 1;
    }

    .movie-title {
      font-size: 42px;
      font-weight: 800;
      line-height: 1.1;
      margin-top: 0;
      margin-bottom: 6px;
      letter-spacing: -1px;
    }

    .original-title {
      font-size: 16px;
      color: #a0aec0;
      margin-top: 0;
      margin-bottom: 16px;
      font-style: italic;
    }

    .meta-row {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 15px;
      color: #cbd5e0;
      font-weight: 600;
      margin-bottom: 20px;
    }

    .rating {
      color: #ffc107;
    }

    .votes {
      font-size: 12px;
      color: #718096;
      font-weight: 500;
    }

    .divider {
      color: rgba(255, 255, 255, 0.15);
    }

    .genres {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 30px;
    }

    .genre-tag {
      font-size: 12px;
      font-weight: 700;
      padding: 4px 12px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      color: #e2e8f0;
    }

    .action-buttons {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .btn-action {
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
    }

    .btn-action:hover {
      background: rgba(255, 255, 255, 0.05);
      transform: translateY(-1px);
    }

    .btn-action.active {
      background: rgba(255, 8, 68, 0.1);
      border-color: #ff0844;
      color: #ff0844;
    }

    .btn-action.ai-match {
      background: linear-gradient(135deg, #7b2cbf 0%, #3a0ca3 100%);
      border: none;
      box-shadow: 0 4px 12px rgba(123, 44, 191, 0.25);
    }

    .btn-action.ai-match:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(123, 44, 191, 0.4);
    }

    .guest-notice {
      font-size: 14px;
      color: #718096;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: 500;
    }

    .overview-section {
      padding: 40px 80px;
      max-width: 1000px;
    }

    .section-heading {
      font-size: 22px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.4px;
      color: #ff0844;
    }

    .synopsis {
      font-size: 16px;
      color: #e2e8f0;
      line-height: 1.6;
    }

    .similar-section {
      padding-top: 20px;
      padding-bottom: 50px;
    }

    @media (max-width: 768px) {
      .loading-wrapper {
        flex-direction: column;
        padding: 20px;
      }
      .backdrop-content {
        padding: 20px;
      }
      .movie-main-info {
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 20px;
      }
      .movie-title {
        font-size: 28px;
      }
      .meta-row {
        justify-content: center;
      }
      .genres {
        justify-content: center;
      }
      .action-buttons {
        justify-content: center;
      }
      .overview-section {
        padding: 30px 20px;
      }
    }
  `]
})
export class MovieDetailsComponent implements OnInit, OnDestroy {
  private readonly movieDetailsService = inject(MovieDetailsService);
  readonly authState = inject(AuthStateService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly watchedService = inject(WatchedService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly movie = signal<MovieDetail | null>(null);
  readonly similar = signal<any[]>([]);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);

  readonly isFav = signal<boolean>(false);
  readonly isWatched = signal<boolean>(false);

  movieId!: number;

  private langChangeSub?: Subscription;

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const idStr = params.get('id');
      if (idStr) {
        this.movieId = parseInt(idStr, 10);
        this.loadMovieData(this.movieId);
      }
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      if (this.movieId) {
        this.loadMovieData(this.movieId);
      }
    });
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
  }

  loadMovieData(id: number) {
    this.loading.set(true);
    this.error.set(false);

    this.movieDetailsService.getMovieDetails(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.movie.set(response.data);
          this.isFav.set(response.data.isFavorite);
          this.isWatched.set(response.data.isWatched);

          this.fetchSimilar(id);
        } else {
          this.error.set(true);
          this.loading.set(false);
        }
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }

  fetchSimilar(id: number) {
    this.movieDetailsService.getSimilarMovies(id).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.similar.set(response.data);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  formatRuntime(minutes: number | null | undefined): string {
    if (!minutes) return '';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  }

  toggleFavorite() {
    if (!this.authState.isAuthenticated()) return;

    if (this.isFav()) {
      this.favoritesService.removeFavorite(this.movieId).subscribe({
        next: (res) => {
          if (res.success) {
            this.isFav.set(false);
            if (this.movie()) this.movie()!.isFavorite = false;
          }
        }
      });
    } else {
      this.favoritesService.addFavorite(this.movieId).subscribe({
        next: (res) => {
          if (res.success) {
            this.isFav.set(true);
            if (this.movie()) this.movie()!.isFavorite = true;
          }
        }
      });
    }
  }

  toggleWatched() {
    if (!this.authState.isAuthenticated()) return;

    if (this.isWatched()) {
      this.watchedService.removeWatched(this.movieId).subscribe({
        next: (res) => {
          if (res.success) {
            this.isWatched.set(false);
            if (this.movie()) this.movie()!.isWatched = false;
          }
        }
      });
    } else {
      this.watchedService.addWatched(this.movieId).subscribe({
        next: (res) => {
          if (res.success) {
            this.isWatched.set(true);
            if (this.movie()) this.movie()!.isWatched = true;
          }
        }
      });
    }
  }

  aiSimilar() {
    if (!this.authState.isAuthenticated()) return;
    this.router.navigate(['/recommendations'], {
      state: {
        rerunRequest: {
          entryType: 'free_text',
          seedMovieId: this.movieId,
          freeTextPrompt: `More movies like ${this.movie()?.title || ''}`,
        }
      }
    });
  }
}
