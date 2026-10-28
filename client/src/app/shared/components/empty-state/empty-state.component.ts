import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  imports: [CommonModule, TranslateModule],
  template: `
    <div class="empty-state">
      <div class="icon-wrapper">
        <span class="icon">{{ icon }}</span>
      </div>
      <h3 class="title">{{ title | translate }}</h3>
      <p class="description">{{ description | translate }}</p>
      <button 
        *ngIf="showAction" 
        (click)="actionClicked.emit()" 
        class="action-btn"
      >
        {{ actionText | translate }}
      </button>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 40px 20px;
      max-width: 400px;
      margin: 0 auto;
    }

    .icon-wrapper {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.03);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }

    .icon {
      font-size: 32px;
    }

    .title {
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
      margin: 0 0 10px 0;
    }

    .description {
      font-size: 14px;
      color: #718096;
      margin: 0 0 24px 0;
      line-height: 1.5;
    }

    .action-btn {
      padding: 10px 24px;
      background: #ff0844;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(255, 8, 68, 0.2);
    }

    .action-btn:hover {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(255, 8, 68, 0.3);
    }
  `]
})
export class EmptyStateComponent {
  @Input() icon: string = '🎬';
  @Input() title: string = 'COMMON.EMPTY_TITLE';
  @Input() description: string = 'COMMON.EMPTY_DESC';
  @Input() showAction: boolean = false;
  @Input() actionText: string = 'COMMON.RETRY';

  @Output() actionClicked = new EventEmitter<void>();
}
