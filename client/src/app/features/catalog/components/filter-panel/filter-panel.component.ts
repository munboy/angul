import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { Genre } from '../../catalog.service';

export interface FilterState {
  genreId?: number;
  year?: number;
  minRating?: number;
  excludeWatched?: boolean;
}

@Component({
  selector: 'app-filter-panel',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="filter-panel">
      <div class="filter-group">
        <label>{{ 'CATALOG.FILTER_GENRE' | translate }}</label>
        <select [value]="genreId || ''" (change)="onGenreChange($event)" class="filter-select">
          <option value="">{{ 'CATALOG.ALL_GENRES' | translate }}</option>
          <option *ngFor="let g of genres" [value]="g.id">{{ g.name }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label>{{ 'CATALOG.FILTER_YEAR' | translate }}</label>
        <select [value]="year || ''" (change)="onYearChange($event)" class="filter-select">
          <option value="">{{ 'CATALOG.ALL_YEARS' | translate }}</option>
          <option *ngFor="let y of years" [value]="y">{{ y }}</option>
        </select>
      </div>

      <div class="filter-group">
        <label>{{ 'CATALOG.FILTER_RATING' | translate }}</label>
        <select [value]="minRating || ''" (change)="onRatingChange($event)" class="filter-select">
          <option value="">{{ 'CATALOG.ALL_RATINGS' | translate }}</option>
          <option value="5">⭐ {{ 'CATALOG.RATING_5' | translate }}</option>
          <option value="7">⭐ {{ 'CATALOG.RATING_7' | translate }}</option>
          <option value="8">⭐ {{ 'CATALOG.RATING_8' | translate }}</option>
          <option value="9">⭐ {{ 'CATALOG.RATING_9' | translate }}</option>
        </select>
      </div>

      <div class="filter-group checkbox-group" *ngIf="isAuthenticated">
        <label class="checkbox-label">
          <input 
            type="checkbox" 
            [checked]="excludeWatched" 
            (change)="onExcludeChange($event)"
            class="filter-checkbox"
          />
          <span class="checkbox-custom"></span>
          {{ 'CATALOG.EXCLUDE_WATCHED' | translate }}
        </label>
      </div>
      
      <button (click)="resetFilters()" class="btn-reset">
        {{ 'CATALOG.RESET_FILTERS' | translate }}
      </button>
    </div>
  `,
  styles: [`
    .filter-panel {
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
      align-items: flex-end;
      justify-content: center;
      margin-top: 20px;
    }

    .filter-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      flex: 1 1 200px;
      max-width: 250px;
    }

    .filter-group label {
      font-size: 12px;
      font-weight: 700;
      color: #718096;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .filter-select {
      background: #0f0f15;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      color: #ffffff;
      padding: 10px 14px;
      font-size: 14px;
      outline: none;
      cursor: pointer;
      transition: border-color 0.2s ease;
    }

    .filter-select:focus {
      border-color: #ff0844;
    }

    .checkbox-group {
      justify-content: flex-end;
      padding-bottom: 8px;
      max-width: 200px;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px !important;
      color: #e2e8f0 !important;
      font-weight: 500 !important;
      text-transform: none !important;
      cursor: pointer;
      user-select: none;
      position: relative;
    }

    .filter-checkbox {
      position: absolute;
      opacity: 0;
      cursor: pointer;
      height: 0;
      width: 0;
    }

    .checkbox-custom {
      height: 20px;
      width: 20px;
      background-color: #0f0f15;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 4px;
      display: inline-block;
      position: relative;
      transition: all 0.2s ease;
    }

    .checkbox-label:hover .checkbox-custom {
      border-color: #ff0844;
    }

    .filter-checkbox:checked ~ .checkbox-custom {
      background-color: #ff0844;
      border-color: #ff0844;
    }

    .checkbox-custom::after {
      content: "";
      position: absolute;
      display: none;
      left: 7px;
      top: 3px;
      width: 5px;
      height: 10px;
      border: solid white;
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }

    .filter-checkbox:checked ~ .checkbox-custom::after {
      display: block;
    }

    .btn-reset {
      padding: 10px 18px;
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.15);
      color: #a0aec0;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      height: 40px;
      margin-bottom: 2px;
    }

    .btn-reset:hover {
      border-color: #ffffff;
      color: #ffffff;
      background: rgba(255, 255, 255, 0.03);
    }

    @media (max-width: 768px) {
      .filter-panel {
        flex-direction: column;
        align-items: stretch;
      }
      .filter-group {
        max-width: none;
      }
      .btn-reset {
        width: 100%;
      }
    }
  `]
})
export class FilterPanelComponent implements OnInit {
  @Input() genres: Genre[] = [];
  @Input() isAuthenticated: boolean = false;
  
  @Input() genreId?: number;
  @Input() year?: number;
  @Input() minRating?: number;
  @Input() excludeWatched: boolean = false;

  @Output() filterChange = new EventEmitter<FilterState>();

  years: number[] = [];

  ngOnInit() {
    const currentYear = new Date().getFullYear();
    for (let y = currentYear; y >= 1980; y--) {
      this.years.push(y);
    }
  }

  onGenreChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.genreId = val ? parseInt(val, 10) : undefined;
    this.emitChange();
  }

  onYearChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.year = val ? parseInt(val, 10) : undefined;
    this.emitChange();
  }

  onRatingChange(event: Event) {
    const val = (event.target as HTMLSelectElement).value;
    this.minRating = val ? parseFloat(val) : undefined;
    this.emitChange();
  }

  onExcludeChange(event: Event) {
    this.excludeWatched = (event.target as HTMLInputElement).checked;
    this.emitChange();
  }

  resetFilters() {
    this.genreId = undefined;
    this.year = undefined;
    this.minRating = undefined;
    this.excludeWatched = false;
    this.emitChange();
  }

  private emitChange() {
    this.filterChange.emit({
      genreId: this.genreId,
      year: this.year,
      minRating: this.minRating,
      excludeWatched: this.excludeWatched
    });
  }
}
