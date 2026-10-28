import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-skeleton-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div [ngClass]="['skeleton-wrapper', type]">
      <ng-container *ngIf="type === 'rail'">
        <div class="skeleton-title shimmer"></div>
        <div class="skeleton-row">
          <div *ngFor="let i of [1, 2, 3, 4, 5, 6]" class="skeleton-card">
            <div class="skeleton-poster shimmer"></div>
            <div class="skeleton-text shimmer"></div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="type === 'grid'">
        <div class="skeleton-grid">
          <div *ngFor="let i of [1, 2, 3, 4, 5, 6, 7, 8]" class="skeleton-card">
            <div class="skeleton-poster shimmer"></div>
            <div class="skeleton-text shimmer"></div>
          </div>
        </div>
      </ng-container>

      <ng-container *ngIf="type === 'card'">
        <div class="skeleton-card">
          <div class="skeleton-poster shimmer"></div>
          <div class="skeleton-text shimmer"></div>
        </div>
      </ng-container>
    </div>
  `,
  styles: [`
    .skeleton-wrapper {
      width: 100%;
      margin-bottom: 20px;
    }

    .skeleton-wrapper.rail {
      padding: 0 40px;
    }

    @media (max-width: 768px) {
      .skeleton-wrapper.rail {
        padding: 0 20px;
      }
    }

    .skeleton-title {
      height: 24px;
      width: 150px;
      background: #1e1e2d;
      border-radius: 4px;
      margin-bottom: 16px;
    }

    .skeleton-row {
      display: flex;
      gap: 16px;
      overflow-x: hidden;
    }

    .skeleton-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 20px;
    }

    @media (max-width: 576px) {
      .skeleton-grid {
        grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
        gap: 12px;
      }
    }

    .skeleton-card {
      display: flex;
      flex-direction: column;
      width: 160px;
      flex-shrink: 0;
    }

    .grid .skeleton-card {
      width: 100%;
    }

    .skeleton-poster {
      aspect-ratio: 2 / 3;
      width: 100%;
      background: #1e1e2d;
      border-radius: 12px;
      margin-bottom: 8px;
    }

    .skeleton-text {
      height: 14px;
      width: 80%;
      background: #1e1e2d;
      border-radius: 4px;
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
export class SkeletonLoaderComponent {
  @Input() type: 'card' | 'rail' | 'grid' = 'card';
}
