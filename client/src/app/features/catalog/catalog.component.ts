import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import { CatalogService, Genre, FilterState } from './catalog.service';
import { AuthStateService } from '../../core/services/auth-state.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SearchBarComponent } from './components/search-bar/search-bar.component';
import { FilterPanelComponent } from './components/filter-panel/filter-panel.component';
import { MovieCardComponent } from '../../shared/components/movie-card/movie-card.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    NavbarComponent,
    SearchBarComponent,
    FilterPanelComponent,
    MovieCardComponent,
    SkeletonLoaderComponent,
    EmptyStateComponent,
  ],
  template: `
    <div class="catalog-container">
      <app-navbar></app-navbar>

      <main class="catalog-content">
        <div class="page-header">
          <h1 class="page-title">{{ 'CATALOG.TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'CATALOG.SUBTITLE' | translate }}</p>
        </div>

        <app-search-bar 
          [initialValue]="filters.q || ''"
          (search)="onSearch($event)"
        ></app-search-bar>

        <app-filter-panel
          [genres]="genres()"
          [isAuthenticated]="authState.isAuthenticated()"
          [genreId]="filters.genreId"
          [year]="filters.year"
          [minRating]="filters.minRating"
          [excludeWatched]="filters.excludeWatched || false"
          (filterChange)="onFilterChange($event)"
        ></app-filter-panel>

        <div class="results-loading" *ngIf="loading()">
          <app-skeleton-loader type="grid"></app-skeleton-loader>
        </div>

        <app-empty-state
          *ngIf="error()"
          icon="⚠️"
          title="CATALOG.ERROR_TITLE"
          description="CATALOG.ERROR_DESC"
          [showAction]="true"
          actionText="COMMON.RETRY"
          (actionClicked)="fetchMovies()"
        ></app-empty-state>

        <ng-container *ngIf="!loading() && !error()">
          <app-empty-state
            *ngIf="movies().length === 0"
            icon="🔍"
            title="CATALOG.NO_RESULTS_TITLE"
            description="CATALOG.NO_RESULTS_DESC"
            [showAction]="true"
            actionText="CATALOG.RESET_SEARCH"
            (actionClicked)="resetFiltersAndSearch()"
          ></app-empty-state>

          <div class="movies-grid" *ngIf="movies().length > 0">
            <div class="grid-item" *ngFor="let movie of movies()">
              <app-movie-card [movie]="movie"></app-movie-card>
            </div>
          </div>

          <div class="pagination" *ngIf="movies().length > 0 && totalPages() > 1">
            <button 
              [disabled]="page() === 1" 
              (click)="changePage(page() - 1)" 
              class="btn-page"
            >
              ⬅️ {{ 'CATALOG.PREV' | translate }}
            </button>
            
            <span class="page-info">
              {{ 'CATALOG.PAGE' | translate }} {{ page() }} / {{ totalPages() }}
            </span>

            <button 
              [disabled]="page() === totalPages()" 
              (click)="changePage(page() + 1)" 
              class="btn-page"
            >
              {{ 'CATALOG.NEXT' | translate }} ➡️
            </button>
          </div>
        </ng-container>
      </main>
    </div>
  `,
  styles: [`
    .catalog-container {
      min-height: 100vh;
      background: #0f0f15;
      color: #ffffff;
      font-family: 'Outfit', 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }

    .catalog-content {
      flex: 1;
      padding: 40px;
      max-width: 1400px;
      width: 100%;
      margin: 0 auto;
    }

    .page-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .page-title {
      font-size: 36px;
      font-weight: 800;
      letter-spacing: -1px;
      margin-bottom: 8px;
    }

    .page-subtitle {
      font-size: 16px;
      color: #718096;
    }

    .results-loading {
      margin-top: 40px;
    }

    .movies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 30px;
      margin-top: 40px;
    }

    .grid-item {
      display: flex;
    }

    .pagination {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin-top: 50px;
      padding-top: 30px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
    }

    .btn-page {
      padding: 10px 20px;
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #ffffff;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .btn-page:hover:not(:disabled) {
      background: #ff0844;
      border-color: #ff0844;
    }

    .btn-page:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }

    .page-info {
      font-size: 14px;
      color: #a0aec0;
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .catalog-content {
        padding: 20px;
      }
      .movies-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 16px;
      }
      .page-title {
        font-size: 28px;
      }
    }
  `]
})
export class CatalogComponent implements OnInit, OnDestroy {
  private readonly catalogService = inject(CatalogService);
  readonly authState = inject(AuthStateService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  readonly movies = signal<any[]>([]);
  readonly genres = signal<Genre[]>([]);
  readonly totalPages = signal<number>(1);
  readonly page = signal<number>(1);
  readonly loading = signal<boolean>(true);
  readonly error = signal<boolean>(false);

  filters: FilterState = {
    q: undefined,
    genreId: undefined,
    year: undefined,
    minRating: undefined,
    excludeWatched: false
  };

  private langChangeSub?: Subscription;

  ngOnInit() {
    this.catalogService.getGenres().subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.genres.set(response.data);
        }
      }
    });

    this.route.queryParams.subscribe(params => {
      this.filters = {
        q: params['q'] || undefined,
        genreId: params['genreId'] ? parseInt(params['genreId'], 10) : undefined,
        year: params['year'] ? parseInt(params['year'], 10) : undefined,
        minRating: params['minRating'] ? parseFloat(params['minRating']) : undefined,
        excludeWatched: params['excludeWatched'] === 'true'
      };
      
      const pageNum = params['page'] ? parseInt(params['page'], 10) : 1;
      this.page.set(pageNum);

      this.fetchMovies();
    });

    this.langChangeSub = this.translate.onLangChange.subscribe(() => {
      this.fetchMovies();
    });
  }

  ngOnDestroy() {
    this.langChangeSub?.unsubscribe();
  }

  fetchMovies() {
    this.loading.set(true);
    this.error.set(false);

    const queryParams = {
      ...this.filters,
      page: this.page()
    };

    this.catalogService.searchMovies(queryParams).subscribe({
      next: (response) => {
        if (response.success && response.data) {
          this.movies.set(response.data.items);
          this.totalPages.set(response.data.totalPages);
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

  onSearch(query: string) {
    this.filters.q = query || undefined;
    this.page.set(1); 
    this.syncUrlParams();
  }

  onFilterChange(newFilters: FilterState) {
    this.filters = { ...this.filters, ...newFilters };
    this.page.set(1); 
    this.syncUrlParams();
  }

  changePage(newPage: number) {
    if (newPage >= 1 && newPage <= this.totalPages()) {
      this.page.set(newPage);
      this.syncUrlParams();
    }
  }

  resetFiltersAndSearch() {
    this.filters = {
      q: undefined,
      genreId: undefined,
      year: undefined,
      minRating: undefined,
      excludeWatched: false
    };
    this.page.set(1);
    this.syncUrlParams();
  }

  private syncUrlParams() {
    const queryParams: any = {
      page: this.page()
    };

    if (this.filters.q) queryParams.q = this.filters.q;
    if (this.filters.genreId) queryParams.genreId = this.filters.genreId;
    if (this.filters.year) queryParams.year = this.filters.year;
    if (this.filters.minRating) queryParams.minRating = this.filters.minRating;
    if (this.filters.excludeWatched) queryParams.excludeWatched = 'true';

    this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: '', 
    });
  }
}
