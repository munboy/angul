import { Component, Input, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TmdbImagePipe } from '../../pipes/tmdb-image.pipe';
import { AuthStateService } from '../../../core/services/auth-state.service';
import { FavoritesService } from '../../../core/services/favorites.service';
import { WatchedService } from '../../../core/services/watched.service';

import { MovieCard } from '../../../features/home/home.service';

@Component({
  selector: 'app-movie-card',
  standalone: true,
  imports: [RouterLink, CommonModule, TmdbImagePipe],
  template: `
    <div class="movie-card" [routerLink]="['/catalog', movie.id]">
      <div class="poster-wrapper">
        <img 
          [src]="movie.posterPath | tmdbImage:'w342'" 
          [alt]="movie.title" 
          class="poster-img" 
          loading="lazy"
          (error)="onPosterError($event)"
        />

        <div class="card-quick-actions" *ngIf="authState.isAuthenticated()">
          <button 
            (click)="toggleFavorite($event)" 
            [class.active]="movie.isFavorite"
            class="action-icon-btn" 
            title="Favorite"
          >
            {{ movie.isFavorite ? '★' : '☆' }}
          </button>
          <button 
            (click)="toggleWatched($event)" 
            [class.active]="movie.isWatched"
            class="action-icon-btn" 
            title="Watched"
          >
            {{ movie.isWatched ? '👁️' : '👁️‍🗨️' }}
          </button>
        </div>

        <div class="hover-overlay">
          <div class="overlay-content">
            <span class="rating">⭐ {{ movie.voteAverage | number:'1.1-1' }}</span>
            <span class="year">{{ movie.releaseDate ? (movie.releaseDate | date:'yyyy') : 'N/A' }}</span>
            <div class="genres-chips">
              <span *ngFor="let g of movie.genres | slice:0:2" class="genre-chip">{{ g.name }}</span>
            </div>
            <button class="btn-more">More Info</button>
          </div>
        </div>
      </div>
      <div class="info">
        <h4 class="title" [title]="movie.title">{{ movie.title }}</h4>
      </div>
    </div>
  `,
  styles: [`
    .movie-card {
      display: flex;
      flex-direction: column;
      width: 100%;
      cursor: pointer;
      position: relative;
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .movie-card:hover {
      transform: translateY(-8px) scale(1.03);
    }

    .poster-wrapper {
      position: relative;
      aspect-ratio: 2 / 3;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      background: #1a1a24;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .poster-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.5s ease;
      
      background: #1a1a2e;
    }

    .movie-card:hover .poster-img {
      transform: scale(1.05);
    }

    .card-quick-actions {
      position: absolute;
      top: 10px;
      right: 10px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      z-index: 20;
      opacity: 0.8;
      transition: opacity 0.2s ease;
    }

    .movie-card:hover .card-quick-actions {
      opacity: 1;
    }

    .action-icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: rgba(15, 15, 21, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #cbd5e0;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s ease;
    }

    .action-icon-btn:hover {
      background: #181825;
      color: #ffffff;
      transform: scale(1.1);
    }

    .action-icon-btn.active {
      color: #ff0844;
      border-color: rgba(255, 8, 68, 0.3);
      background: rgba(255, 8, 68, 0.1);
    }

    .hover-overlay {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(to top, rgba(15, 15, 21, 0.95) 10%, rgba(15, 15, 21, 0.4) 100%);
      display: flex;
      align-items: flex-end;
      padding: 16px;
      opacity: 0;
      transition: opacity 0.3s ease;
      z-index: 10;
    }

    .movie-card:hover .hover-overlay {
      opacity: 1;
    }

    .overlay-content {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 8px;
      transform: translateY(10px);
      transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    }

    .movie-card:hover .overlay-content {
      transform: translateY(0);
    }

    .rating {
      font-size: 14px;
      font-weight: 700;
      color: #ffc107;
    }

    .year {
      font-size: 12px;
      color: #a0aec0;
      font-weight: 500;
    }

    .genres-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .genre-chip {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
      color: #e2e8f0;
      font-weight: 600;
    }

    .btn-more {
      width: 100%;
      padding: 8px;
      border: none;
      background: #ff0844;
      color: #ffffff;
      font-size: 12px;
      font-weight: 700;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 4px;
      box-shadow: 0 4px 10px rgba(255, 8, 68, 0.2);
    }

    .info {
      padding: 10px 4px 4px 4px;
    }

    .title {
      font-size: 14px;
      font-weight: 700;
      color: #ffffff;
      margin: 0;
      
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      text-overflow: ellipsis;
      min-height: calc(14px * 1.3 * 2);
      line-height: 1.3;
      transition: color 0.2s ease;
    }

    .movie-card:hover .title {
      color: #ff0844;
    }

    @media (hover: none) {
      .movie-card:hover {
        transform: none;
      }
      .movie-card:hover .poster-img {
        transform: none;
      }
      .hover-overlay {
        display: none !important;
      }
      .card-quick-actions {
        opacity: 1;
        top: 5px;
        right: 5px;
      }
      .action-icon-btn {
        width: 28px;
        height: 28px;
        font-size: 14px;
      }
      .title {
        white-space: normal;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }
    }
  `]
})
export class MovieCardComponent {
  readonly authState = inject(AuthStateService);
  private readonly favoritesService = inject(FavoritesService);
  private readonly watchedService = inject(WatchedService);

  @Input({ required: true }) movie!: MovieCard;

  toggleFavorite(event: Event) {
    event.stopPropagation();
    if (!this.authState.isAuthenticated()) return;

    if (this.movie.isFavorite) {
      this.favoritesService.removeFavorite(this.movie.id).subscribe({
        next: (res) => {
          if (res.success) this.movie.isFavorite = false;
        }
      });
    } else {
      this.favoritesService.addFavorite(this.movie.id).subscribe({
        next: (res) => {
          if (res.success) this.movie.isFavorite = true;
        }
      });
    }
  }

  toggleWatched(event: Event) {
    event.stopPropagation();
    if (!this.authState.isAuthenticated()) return;

    if (this.movie.isWatched) {
      this.watchedService.removeWatched(this.movie.id).subscribe({
        next: (res) => {
          if (res.success) this.movie.isWatched = false;
        }
      });
    } else {
      this.watchedService.addWatched(this.movie.id).subscribe({
        next: (res) => {
          if (res.success) this.movie.isWatched = true;
        }
      });
    }
  }

  onPosterError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'https://placehold.co/342x513/1a1a2e/6b7280?text=🎬';
    img.onerror = null;
  }
}
