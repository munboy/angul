import { Component, Input, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MovieCardComponent } from '../movie-card/movie-card.component';

@Component({
  selector: 'app-rail',
  standalone: true,
  imports: [CommonModule, TranslateModule, MovieCardComponent],
  template: `
    <div class="rail-container" *ngIf="movies && movies.length > 0">
      <h3 class="rail-title">
        <ng-container *ngIf="translateTitle; else plainTitle">
          {{ title | translate }}
        </ng-container>
        <ng-template #plainTitle>
          {{ title }}
        </ng-template>
      </h3>

      <button class="nav-arrow left" (click)="scroll('left')" type="button">
        ‹
      </button>

      <div class="rail-track" #track>
        <div class="rail-item" *ngFor="let movie of movies; trackBy: trackById">
          <app-movie-card [movie]="movie"></app-movie-card>
        </div>
      </div>

      <button class="nav-arrow right" (click)="scroll('right')" type="button">
        ›
      </button>
    </div>
  `,
  styles: [`
    .rail-container {
      margin-bottom: 30px;
      padding: 0 40px;
      position: relative;
    }

    .rail-title {
      font-size: 20px;
      font-weight: 700;
      color: #ffffff;
      margin-top: 0;
      margin-bottom: 16px;
      letter-spacing: -0.3px;
    }

    .nav-arrow {
      position: absolute;
      top: calc(50% + 10px);
      transform: translateY(-50%);
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(24, 24, 37, 0.85);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #ffffff;
      font-size: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      z-index: 10;
      transition: all 0.2s ease;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
      opacity: 0;
      user-select: none;
    }

    .rail-container:hover .nav-arrow {
      opacity: 1;
    }

    .nav-arrow:hover {
      background: #ff0844;
      border-color: #ff0844;
      box-shadow: 0 4px 15px rgba(255, 8, 68, 0.4);
      transform: translateY(-50%) scale(1.1);
    }

    .nav-arrow.left {
      left: 15px;
    }

    .nav-arrow.right {
      right: 15px;
    }

    .rail-track {
      display: flex;
      overflow-x: auto;
      scroll-behavior: smooth;
      gap: 16px;
      padding: 8px 4px;
      
      -webkit-overflow-scrolling: touch;
    }

    .rail-track::-webkit-scrollbar {
      display: none;
    }

    .rail-track {
      
      -ms-overflow-style: none;  
      scrollbar-width: none;  
    }

    .rail-item {
      flex: 0 0 160px; 
      scroll-snap-align: start;
    }

    @media (max-width: 768px) {
      .rail-container {
        padding: 0 20px;
      }
      
      .rail-item {
        flex: 0 0 130px; 
      }
      
      .rail-title {
        font-size: 18px;
        margin-bottom: 12px;
      }

      .nav-arrow {
        display: none !important; 
      }
    }
  `]
})
export class RailComponent {
  @Input({ required: true }) title!: string;
  @Input() movies: any[] = [];
  @Input() translateTitle = false;

  @ViewChild('track') track!: ElementRef<HTMLDivElement>;

  scroll(direction: 'left' | 'right') {
    if (!this.track) return;
    const element = this.track.nativeElement;
    const scrollAmount = 500;
    if (direction === 'left') {
      element.scrollLeft -= scrollAmount;
    } else {
      element.scrollLeft += scrollAmount;
    }
  }

  trackById(index: number, item: any): number {
    return item.id;
  }
}
