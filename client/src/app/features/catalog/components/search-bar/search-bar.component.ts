import { Component, Output, EventEmitter, OnInit, OnDestroy, Input } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-search-bar',
  standalone: true,
  imports: [ReactiveFormsModule, TranslateModule],
  template: `
    <div class="search-container">
      <span class="search-icon">🔍</span>
      <input
        [formControl]="searchControl"
        type="text"
        [placeholder]="'CATALOG.SEARCH_PLACEHOLDER' | translate"
        class="search-input"
      />
      @if (searchControl.value) {
        <button 
          (click)="clearSearch()" 
          class="clear-btn"
        >
          ✕
        </button>
      }
    </div>
  `,
  styles: [`
    .search-container {
      position: relative;
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
    }

    .search-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      font-size: 18px;
      color: #718096;
      pointer-events: none;
    }

    .search-input {
      width: 100%;
      padding: 14px 48px 14px 48px;
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 30px;
      color: #ffffff;
      font-size: 16px;
      font-family: inherit;
      outline: none;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .search-input:focus {
      border-color: #ff0844;
      background: #1c1c2b;
      box-shadow: 0 4px 20px rgba(255, 8, 68, 0.15);
    }

    .clear-btn {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      background: transparent;
      border: none;
      color: #a0aec0;
      font-size: 16px;
      cursor: pointer;
      padding: 4px;
    }

    .clear-btn:hover {
      color: #ffffff;
    }
  `]
})
export class SearchBarComponent implements OnInit, OnDestroy {
  @Input() initialValue: string = '';
  @Output() search = new EventEmitter<string>();

  readonly searchControl = new FormControl('');
  private readonly destroy$ = new Subject<void>();

  ngOnInit() {
    if (this.initialValue) {
      this.searchControl.setValue(this.initialValue, { emitEvent: false });
    }

    this.searchControl.valueChanges.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(value => {
      this.search.emit(value ?? '');
    });
  }

  clearSearch() {
    this.searchControl.setValue('');
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
