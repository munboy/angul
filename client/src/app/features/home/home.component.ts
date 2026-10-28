import { Component, OnInit, OnDestroy, inject, signal, DestroyRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { HomeService, RailsData, MovieCard } from './home.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { RailComponent } from '../../shared/components/rail/rail.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { TmdbImagePipe } from '../../shared/pipes/tmdb-image.pipe';
import { Subscription } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-home',
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
    <div class="home-container">
      <app-navbar></app-navbar>

      <div class="loading-state" *ngIf="loading()">
        <div class="hero-skeleton shimmer"></div>
        <app-skeleton-loader type="rail" class="block-loader"></app-skeleton-loader>
        <app-skeleton-loader type="rail" class="block-loader"></app-skeleton-loader>
      </div>

      <app-empty-state
        *ngIf="error()"
        icon="⚠️"
        title="HOME.ERROR_TITLE"
        description="HOME.ERROR_DESC"
        [showAction]="true"
        actionText="COMMON.RETRY"
        (actionClicked)="loadRails()"
      ></app-empty-state>

      <ng-container *ngIf="!loading() && !error() && railsData()">
        
        <div 
          class="hero-banner" 
          *ngIf="featuredMovie()"
          [style.backgroundImage]="'linear-gradient(to right, rgba(15, 15, 21, 0.9) 30%, rgba(15, 15, 21, 0.3) 100%), url(' + (featuredMovie()!.backdropPath | tmdbImage:'w1280') + ')'"
        >
          <div class="hero-content">
            <span class="spotlight-tag">⭐ {{ 'HOME.SPOTLIGHT' | translate }}</span>
            <h1 class="hero-title">{{ featuredMovie()!.title }}</h1>
            <p class="hero-overview">{{ featuredMovie()!.overview }}</p>
            <div class="hero-actions">
              <button [routerLink]="['/catalog', featuredMovie()!.id]" class="btn-play">
                ℹ️ {{ 'HOME.MORE_INFO' | translate }}
              </button>
            </div>
          </div>
        </div>

        <div class="rails-wrapper">
          <app-rail
            *ngIf="railsData()?.personalized"
            [title]="'HOME.FOR_YOU'"
            [translateTitle]="true"
            [movies]="railsData()!.personalized || []"
          ></app-rail>

          <app-rail
            [title]="'HOME.NEW_RELEASES'"
            [translateTitle]="true"
            [movies]="railsData()!.newReleases"
          ></app-rail>

          <app-rail
            [title]="'HOME.POPULAR'"
            [translateTitle]="true"
            [movies]="railsData()!.popular"
          ></app-rail>

          <ng-container *ngFor="let row of railsData()!.byGenre">
            <app-rail
              [title]="row.genre.name"
              [translateTitle]="false"
              [movies]="row.movies"
            ></app-rail>
          </ng-container>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .home-container {
      min-height: 100vh;
      background: #0f0f15;
      color: #ffffff;
      font-family: 'Outfit', 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }

    .loading-state {
      flex: 1;
      padding-bottom: 40px;
    }

    .hero-skeleton {
      height: 70vh;
      background: #1e1e2d;
      margin-bottom: 40px;
      width: 100%;
    }

    .block-loader {
      display: block;
      margin-bottom: 40px;
    }

    .hero-banner {
      height: 70vh;
      background-size: cover;
      background-position: center top;
      display: flex;
      align-items: center;
      padding: 0 80px;
      margin-bottom: 20px;
      position: relative;
    }

    .hero-content {
      max-width: 600px;
      z-index: 10;
    }

    .spotlight-tag {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(255, 8, 68, 0.2);
      border: 1px solid #ff0844;
      color: #ffffff;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      margin-bottom: 16px;
      letter-spacing: 0.5px;
    }

    .hero-title {
      font-size: 48px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 16px;
      letter-spacing: -1px;
    }

    .hero-overview {
      font-size: 16px;
      color: #cbd5e0;
      line-height: 1.5;
      margin-bottom: 24px;
      display: -webkit-box;
      -webkit-line-clamp: 4;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .btn-play {
      padding: 12px 28px;
      background: #ffffff;
      color: #0f0f15;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 15px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 10px;
      transition: all 0.2s ease;
    }

    .btn-play:hover {
      background: #e2e8f0;
      transform: scale(1.02);
    }

    .rails-wrapper {
      padding-bottom: 50px;
    }

    @media (max-width: 768px) {
      .hero-banner {
        height: 50vh;
        padding: 0 20px;
      }
      .hero-title {
        font-size: 32px;
      }
      .hero-overview {
        font-size: 14px;
        -webkit-line-clamp: 3;
      }
    }

    .shimmer {
      position: relative;
      overflow: hidden;
      background-color: #1e1e2d;
    }

    .shimmer::after {
      position: absolute;
      top: 0;
      right: 0;
      bottom: 0;
      left: 0;
      transform: translateX(-100%);
      background-image: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.05) 20%,
        rgba(255, 255, 255, 0.1) 60%,
        rgba(255, 255, 255, 0) 100%
      );
      animation: shimmer 1.5s infinite;
      content: '';
    }

    @keyframes shimmer {
      100% {
        transform: translateX(100%);
      }
    }
  `]
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly homeService = inject(HomeService);
  private readonly translate = inject(TranslateService);
  private readonly destroyRef = inject(DestroyRef);

  readonly railsData = signal<RailsData | null>(null);
  readonly featuredMovie = signal<MovieCard | null>(null);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);

  private langChangeSub?: Subscription;

  ngOnInit() {
    this.loadRails();
    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.loadRails();
    });
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
  }

  loadRails() {
    this.loading.set(true);
    this.error.set(false);

    this.homeService.getRails().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.railsData.set(response.data);
          if (response.data.popular && response.data.popular.length > 0) {
            this.featuredMovie.set(response.data.popular[0]);
          }
        } else {
          this.error.set(true);
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set(true);
        this.loading.set(false);
      }
    });
  }
}
