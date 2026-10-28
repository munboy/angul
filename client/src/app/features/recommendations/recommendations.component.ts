import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { TmdbImagePipe } from '../../shared/pipes/tmdb-image.pipe';
import { AuthStateService } from '../../core/services/auth-state.service';
import {
  RecommendationService,
  RecommendationResponse,
  RecommendationMovieCard,
  HistorySession,
  ScenarioKey,
} from '../../core/services/recommendation.service';

interface QuickScenario {
  key: ScenarioKey;
  emoji: string;
  labelKey: string;
}

interface RefinementChip {
  key: string;
  labelKey: string;
  emoji: string;
}

type FlowStep = 'start' | 'mood' | 'genre' | 'result';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    TranslateModule,
    NavbarComponent,
    TmdbImagePipe,
  ],
  template: `
    <div class="rec-page">
      <app-navbar></app-navbar>

      <div class="rec-container">
        <div class="rec-header">
          <div class="ai-badge">
            <span class="ai-dot"></span>
            {{ 'REC.AI_BADGE' | translate }}
          </div>
          <h1 class="rec-title">{{ 'REC.TITLE' | translate }}</h1>
          <p class="rec-subtitle">{{ 'REC.SUBTITLE' | translate }}</p>
        </div>

        @if (step() === 'start') {
          <div class="step-section" @fadeIn>
            <p class="step-hint">{{ 'REC.STEP_HINT_START' | translate }}</p>

            <div class="scenarios-grid">
              @for (s of quickScenarios; track s.key) {
                <button
                  class="scenario-card"
                  [class.selected]="selectedScenario() === s.key"
                  (click)="selectScenario(s.key)"
                >
                  <span class="scenario-emoji">{{ s.emoji }}</span>
                  <span class="scenario-label">{{ s.labelKey | translate }}</span>
                </button>
              }
            </div>

            <div class="divider-or">
              <span>{{ 'REC.OR_TYPE' | translate }}</span>
            </div>

            <div class="free-text-row">
              <textarea
                class="free-text-input"
                [(ngModel)]="freeTextValue"
                [placeholder]="'REC.FREE_TEXT_PLACEHOLDER' | translate"
                rows="3"
              ></textarea>
              <button
                class="btn-primary"
                [disabled]="!freeTextValue.trim() || loading()"
                (click)="submitFreeText()"
              >
                @if (loading()) {
                  <span class="spinner"></span>
                } @else {
                  ✨ {{ 'REC.GET_PICKS' | translate }}
                }
              </button>
            </div>
          </div>
        }

        @if (step() === 'mood') {
          <div class="step-section">
            <div class="back-row">
              <button class="btn-back" (click)="goBack()">← {{ 'REC.BACK' | translate }}</button>
            </div>

            <p class="step-hint">{{ 'REC.STEP_HINT_MOOD' | translate }}</p>

            <div class="chips-row">
              @for (mood of moods; track mood.key) {
                <button
                  class="chip"
                  [class.selected]="selectedMood() === mood.key"
                  (click)="selectMood(mood.key)"
                >
                  {{ mood.emoji }} {{ mood.labelKey | translate }}
                </button>
              }
            </div>

            <div class="mood-actions">
              <button
                class="btn-primary"
                [disabled]="loading()"
                (click)="submitScenario()"
              >
                @if (loading()) {
                  <span class="spinner"></span>
                } @else {
                  ✨ {{ 'REC.GET_PICKS' | translate }}
                }
              </button>
              <button class="btn-skip" (click)="submitScenario()">
                {{ 'REC.SKIP_MOOD' | translate }}
              </button>
            </div>
          </div>
        }

        @if (loading() && step() !== 'result') {
          <div class="loading-area">
            <div class="ai-thinking">
              <div class="thinking-dots">
                <span></span><span></span><span></span>
              </div>
              <p>{{ 'REC.THINKING' | translate }}</p>
            </div>
          </div>
        }

        @if (step() === 'result' && result()) {
          <div class="result-section">
            <div class="explanation-banner">
              <div class="explanation-icon">
                @if (result()!.isFallback) {
                  🎯
                } @else if (result()!.providerUsed === 'google') {
                  🤖
                } @else {
                  ✨
                }
              </div>
              <div class="explanation-text">
                <p>{{ result()!.explanation }}</p>
                @if (result()!.isFallback) {
                  <span class="fallback-note">{{ 'REC.FALLBACK_NOTE' | translate }}</span>
                }
              </div>
            </div>

            <div class="movies-grid">
              @for (movie of result()!.movies; track movie.id) {
                <div class="rec-movie-card">
                  <a [routerLink]="['/catalog', movie.id]" class="card-poster-link">
                    <img
                      [src]="movie.posterPath | tmdbImage:'w342'"
                      [alt]="movie.title"
                      class="card-poster"
                      loading="lazy"
                      (error)="onPosterError($event)"
                    />
                    <div class="card-overlay">
                      <div class="card-rating">⭐ {{ movie.voteAverage | number:'1.1-1' }}</div>
                    </div>
                  </a>
                  <div class="card-info">
                    <h3 class="card-title">{{ movie.title }}</h3>
                    <div class="card-genres">
                      @for (g of movie.genres.slice(0, 2); track g.id) {
                        <span class="genre-tag">{{ g.name }}</span>
                      }
                    </div>
                  </div>
                </div>
              }
            </div>

            @if (result()!.refinementOptions.length) {
              <div class="refinement-section">
                <p class="refinement-hint">{{ 'REC.REFINE_HINT' | translate }}</p>
                <div class="chips-row">
                  @for (opt of visibleRefinements(); track opt.key) {
                    <button
                      class="chip chip-refine"
                      (click)="applyRefinement(opt.key)"
                      [disabled]="loading()"
                    >
                      {{ opt.emoji }} {{ opt.labelKey | translate }}
                    </button>
                  }
                </div>
              </div>
            }

            <div class="result-actions">
              <button class="btn-secondary" (click)="restart()">
                🔄 {{ 'REC.START_OVER' | translate }}
              </button>
            </div>
          </div>
        }

        @if (error()) {
          <div class="error-section">
            <p class="error-msg">⚠️ {{ error() }}</p>
            <button class="btn-secondary" (click)="restart()">
              {{ 'REC.START_OVER' | translate }}
            </button>
          </div>
        }

        @if (authState.isAuthenticated() && history().length && step() === 'start') {
          <div class="history-section">
            <h2 class="history-title">{{ 'REC.HISTORY_TITLE' | translate }}</h2>
            <div class="history-list">
              @for (session of history().slice(0, 5); track session.id) {
                <div class="history-card" (click)="rerunSession(session)">
                  <div class="history-thumbnails">
                    @for (result of getSessionPreviews(session); track result.movie.id) {
                      <img
                        [src]="result.movie.posterPath | tmdbImage:'w92'"
                        [alt]="result.movie.title"
                        class="history-thumb"
                      />
                    }
                  </div>
                  <div class="history-meta">
                    <span class="history-type">{{ formatEntryType(session.entryType) | translate }}</span>
                    <span class="history-date">{{ session.createdAt | date:'MMM d' }}</span>
                  </div>
                </div>
              }
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .rec-page {
      min-height: 100vh;
      background: #0a0a12;
      color: #fff;
      font-family: 'Outfit', 'Inter', sans-serif;
    }

    .rec-container {
      max-width: 900px;
      margin: 0 auto;
      padding: 48px 24px 80px;
    }

    .rec-header {
      text-align: center;
      margin-bottom: 48px;
    }

    .ai-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      background: rgba(124, 58, 237, 0.15);
      border: 1px solid rgba(124, 58, 237, 0.4);
      border-radius: 100px;
      font-size: 12px;
      font-weight: 600;
      color: #a78bfa;
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 20px;
    }

    .ai-dot {
      width: 8px;
      height: 8px;
      background: #7c3aed;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.5; transform: scale(0.8); }
    }

    .rec-title {
      font-size: 42px;
      font-weight: 800;
      letter-spacing: -1.5px;
      line-height: 1.1;
      background: linear-gradient(135deg, #ffffff 0%, #a78bfa 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 12px;
    }

    .rec-subtitle {
      color: #6b7280;
      font-size: 17px;
      max-width: 500px;
      margin: 0 auto;
      line-height: 1.6;
    }

    .step-section {
      animation: fadeUp 0.4s ease;
    }

    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .step-hint {
      text-align: center;
      color: #9ca3af;
      font-size: 15px;
      margin-bottom: 28px;
    }

    .scenarios-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 14px;
      margin-bottom: 32px;
    }

    .scenario-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 10px;
      padding: 24px 16px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      cursor: pointer;
      transition: all 0.2s ease;
      color: #e5e7eb;
      font-size: 14px;
      font-weight: 600;
    }

    .scenario-card:hover {
      background: rgba(124, 58, 237, 0.12);
      border-color: rgba(124, 58, 237, 0.4);
      transform: translateY(-2px);
    }

    .scenario-card.selected {
      background: rgba(124, 58, 237, 0.2);
      border-color: #7c3aed;
      box-shadow: 0 0 20px rgba(124, 58, 237, 0.2);
    }

    .scenario-emoji {
      font-size: 28px;
    }

    .scenario-label {
      text-align: center;
      line-height: 1.3;
    }

    .divider-or {
      display: flex;
      align-items: center;
      gap: 16px;
      margin: 8px 0 24px;
      color: #374151;
      font-size: 13px;
    }

    .divider-or::before, .divider-or::after {
      content: '';
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.08);
    }

    .divider-or span {
      color: #6b7280;
    }

    .free-text-row {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .free-text-input {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      color: #fff;
      font-family: inherit;
      font-size: 15px;
      padding: 14px 16px;
      resize: none;
      outline: none;
      transition: border-color 0.2s;
    }

    .free-text-input:focus {
      border-color: rgba(124, 58, 237, 0.6);
    }

    .free-text-input::placeholder { color: #4b5563; }

    .btn-primary {
      align-self: flex-end;
      padding: 12px 28px;
      background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.2s;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 8px 24px rgba(124, 58, 237, 0.35);
    }

    .btn-primary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-secondary {
      padding: 10px 24px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.12);
      border-radius: 10px;
      color: #d1d5db;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-secondary:hover { background: rgba(255,255,255,0.1); }

    .btn-back {
      background: none;
      border: none;
      color: #6b7280;
      font-size: 14px;
      cursor: pointer;
      padding: 0;
      transition: color 0.2s;
    }

    .btn-back:hover { color: #d1d5db; }

    .btn-skip {
      padding: 10px 20px;
      background: none;
      border: none;
      color: #6b7280;
      font-size: 14px;
      cursor: pointer;
      text-decoration: underline;
      transition: color 0.2s;
    }

    .btn-skip:hover { color: #d1d5db; }

    .back-row {
      margin-bottom: 24px;
    }

    .chips-row {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 24px;
    }

    .chip {
      padding: 8px 16px;
      background: rgba(255,255,255,0.05);
      border: 1px solid rgba(255,255,255,0.1);
      border-radius: 100px;
      color: #d1d5db;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .chip:hover:not(:disabled) {
      background: rgba(124,58,237,0.15);
      border-color: rgba(124,58,237,0.4);
      color: #fff;
    }

    .chip.selected {
      background: rgba(124,58,237,0.2);
      border-color: #7c3aed;
      color: #fff;
    }

    .chip-refine {
      border-style: dashed;
    }

    .mood-actions {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 8px;
    }

    .loading-area {
      display: flex;
      justify-content: center;
      padding: 60px 0;
    }

    .ai-thinking {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      color: #6b7280;
    }

    .thinking-dots {
      display: flex;
      gap: 8px;
    }

    .thinking-dots span {
      width: 10px;
      height: 10px;
      background: #7c3aed;
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;
    }

    .thinking-dots span:nth-child(1) { animation-delay: -0.32s; }
    .thinking-dots span:nth-child(2) { animation-delay: -0.16s; }

    @keyframes bounce {
      0%, 80%, 100% { transform: scale(0); opacity: 0.3; }
      40% { transform: scale(1); opacity: 1; }
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(255,255,255,0.3);
      border-top-color: #fff;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      display: inline-block;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    .explanation-banner {
      display: flex;
      gap: 16px;
      align-items: flex-start;
      background: rgba(124,58,237,0.1);
      border: 1px solid rgba(124,58,237,0.25);
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 32px;
      animation: fadeUp 0.4s ease;
    }

    .explanation-icon {
      font-size: 24px;
      flex-shrink: 0;
    }

    .explanation-text p {
      margin: 0;
      color: #e5e7eb;
      font-size: 15px;
      line-height: 1.6;
    }

    .fallback-note {
      display: block;
      margin-top: 8px;
      font-size: 12px;
      color: #6b7280;
    }

    .movies-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      
      align-items: stretch;
      gap: 16px;
      margin-bottom: 32px;
      animation: fadeUp 0.5s ease;
    }

    .rec-movie-card {
      
      display: flex;
      flex-direction: column;
      border-radius: 12px;
      overflow: hidden;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .rec-movie-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 12px 32px rgba(0,0,0,0.4);
    }

    .card-poster-link {
      position: relative;
      display: block;
      
      aspect-ratio: 2 / 3;
      overflow: hidden;
      text-decoration: none;
      flex-shrink: 0;
    }

    .card-poster {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: transform 0.3s;
      
      background: #1a1a2e;
    }

    .rec-movie-card:hover .card-poster {
      transform: scale(1.04);
    }

    .card-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 8px 10px;
      background: linear-gradient(transparent, rgba(0,0,0,0.7));
    }

    .card-rating {
      font-size: 12px;
      font-weight: 700;
      color: #fbbf24;
    }

    .card-info {
      
      flex: 1;
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      
      min-height: 72px;
    }

    .card-title {
      font-size: 13px;
      font-weight: 700;
      color: #f9fafb;
      margin: 0 0 6px;
      line-height: 1.3;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      
      min-height: calc(13px * 1.3 * 2);
    }

    .card-genres {
      display: flex;
      gap: 4px;
      flex-wrap: wrap;
      
      min-height: 20px;
      align-items: flex-start;
      align-content: flex-start;
    }

    .genre-tag {
      font-size: 10px;
      padding: 2px 6px;
      background: rgba(124,58,237,0.15);
      border: 1px solid rgba(124,58,237,0.25);
      border-radius: 4px;
      color: #a78bfa;
      white-space: nowrap;
    }

    .refinement-section {
      margin-bottom: 28px;
    }

    .refinement-hint {
      color: #6b7280;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .result-actions {
      display: flex;
      gap: 12px;
      justify-content: center;
    }

    .error-section {
      text-align: center;
      padding: 48px 0;
    }

    .error-msg {
      color: #f87171;
      margin-bottom: 20px;
    }

    .history-section {
      margin-top: 60px;
      padding-top: 40px;
      border-top: 1px solid rgba(255,255,255,0.06);
    }

    .history-title {
      font-size: 18px;
      font-weight: 700;
      color: #9ca3af;
      margin-bottom: 16px;
    }

    .history-list {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .history-card {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding: 12px;
      background: rgba(255,255,255,0.03);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.2s;
      max-width: 200px;
    }

    .history-card:hover {
      background: rgba(255,255,255,0.06);
      border-color: rgba(124,58,237,0.3);
    }

    .history-thumbnails {
      display: flex;
      gap: 4px;
    }

    .history-thumb {
      width: 40px;
      height: 60px;
      object-fit: cover;
      border-radius: 4px;
    }

    .history-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .history-type {
      font-size: 11px;
      color: #6b7280;
    }

    .history-date {
      font-size: 11px;
      color: #4b5563;
    }

    @media (max-width: 640px) {
      .rec-container { padding: 32px 16px 60px; }
      .rec-title { font-size: 30px; }
      .scenarios-grid { grid-template-columns: repeat(2, 1fr); }
      .movies-grid { grid-template-columns: repeat(2, 1fr); }
    }
  `]
})
export class RecommendationsComponent implements OnInit {
  readonly authState = inject(AuthStateService);
  private readonly recService = inject(RecommendationService);

  readonly step = signal<FlowStep>('start');
  readonly selectedScenario = signal<ScenarioKey | null>(null);
  readonly selectedMood = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly result = signal<RecommendationResponse | null>(null);
  readonly history = signal<HistorySession[]>([]);

  freeTextValue = '';
  private currentRefinements: Record<string, boolean> = {};

  readonly quickScenarios: QuickScenario[] = [
    { key: 'not_sure', emoji: '🤷', labelKey: 'REC.SCENARIO.NOT_SURE' },
    { key: 'something_light', emoji: '😂', labelKey: 'REC.SCENARIO.LIGHT' },
    { key: 'something_intense', emoji: '🔥', labelKey: 'REC.SCENARIO.INTENSE' },
    { key: 'watch_with_friends', emoji: '👥', labelKey: 'REC.SCENARIO.FRIENDS' },
    { key: 'warm_romance', emoji: '❤️', labelKey: 'REC.SCENARIO.ROMANCE' },
    { key: 'tense_thriller', emoji: '😰', labelKey: 'REC.SCENARIO.THRILLER' },
    { key: 'new_scifi', emoji: '🚀', labelKey: 'REC.SCENARIO.SCIFI' },
    { key: 'no_horror', emoji: '🚫', labelKey: 'REC.SCENARIO.NO_HORROR' },
  ];

  readonly moods = [
    { key: 'relaxed', emoji: '😌', labelKey: 'REC.MOOD.RELAXED' },
    { key: 'excited', emoji: '⚡', labelKey: 'REC.MOOD.EXCITED' },
    { key: 'emotional', emoji: '🥹', labelKey: 'REC.MOOD.EMOTIONAL' },
    { key: 'curious', emoji: '🧠', labelKey: 'REC.MOOD.CURIOUS' },
    { key: 'adventurous', emoji: '🗺️', labelKey: 'REC.MOOD.ADVENTUROUS' },
    { key: 'nostalgic', emoji: '🕰️', labelKey: 'REC.MOOD.NOSTALGIC' },
  ];

  readonly refinementMap: RefinementChip[] = [
    { key: 'lighter', emoji: '🌤️', labelKey: 'REC.REFINE.LIGHTER' },
    { key: 'darker', emoji: '🌑', labelKey: 'REC.REFINE.DARKER' },
    { key: 'newer', emoji: '🆕', labelKey: 'REC.REFINE.NEWER' },
    { key: 'more_serious', emoji: '🎭', labelKey: 'REC.REFINE.MORE_SERIOUS' },
    { key: 'less_romantic', emoji: '💔', labelKey: 'REC.REFINE.LESS_ROMANTIC' },
  ];

  readonly visibleRefinements = computed(() => {
    const opts = this.result()?.refinementOptions ?? [];
    return this.refinementMap.filter((r) => opts.includes(r.key));
  });

  ngOnInit() {
    if (this.authState.isAuthenticated()) {
      this.loadHistory();
    }

    const state = window.history.state;
    if (state && state.rerunRequest) {
      const rerunReq = state.rerunRequest;
      window.history.replaceState({}, '');
      this.callApi(rerunReq);
    }
  }

  selectScenario(key: ScenarioKey) {
    this.selectedScenario.set(key);
    this.step.set('mood');
  }

  selectMood(key: string) {
    this.selectedMood.set(this.selectedMood() === key ? null : key);
  }

  goBack() {
    this.step.set('start');
    this.selectedMood.set(null);
  }

  submitScenario() {
    const scenario = this.selectedScenario();
    if (!scenario) return;

    this.callApi({
      entryType: 'guided',
      scenarioKey: scenario,
      moodInput: this.selectedMood() ?? undefined,
    });
  }

  submitFreeText() {
    const text = this.freeTextValue.trim();
    if (!text) return;

    this.callApi({
      entryType: 'free_text',
      freeTextPrompt: text,
    });
  }

  applyRefinement(refinementKey: string) {
    const mapping: Record<string, string> = {
      lighter: 'lighter',
      darker: 'darker',
      newer: 'newer',
      more_serious: 'moreSerious',
      less_romantic: 'lessRomantic',
    };

    const propKey = mapping[refinementKey] ?? refinementKey;
    this.currentRefinements = { ...this.currentRefinements, [propKey]: true };

    const prev = this.result();
    if (!prev) return;

    const scenario = this.selectedScenario();
    this.callApi({
      entryType: scenario ? 'guided' : 'free_text',
      scenarioKey: scenario ?? undefined,
      moodInput: this.selectedMood() ?? undefined,
      freeTextPrompt: this.freeTextValue.trim() || undefined,
      refinements: this.currentRefinements as any,
    });
  }

  restart() {
    this.step.set('start');
    this.selectedScenario.set(null);
    this.selectedMood.set(null);
    this.result.set(null);
    this.error.set(null);
    this.freeTextValue = '';
    this.currentRefinements = {};
  }

  rerunSession(session: HistorySession) {
    const req = session.requests[0];
    if (!req) return;

    this.callApi({
      entryType: (session.entryType as any) ?? 'quick_scenario',
      scenarioKey: req.scenarioKey ?? undefined,
      freeTextPrompt: req.freeTextPrompt ?? undefined,
    });
  }

  getSessionPreviews(session: HistorySession) {
    return session.requests[0]?.results ?? [];
  }

  formatEntryType(type: string): string {
    const map: Record<string, string> = {
      quick_scenario: 'REC.ENTRY.QUICK_SCENARIO',
      guided: 'REC.ENTRY.GUIDED',
      free_text: 'REC.ENTRY.FREE_TEXT',
    };
    return map[type] ?? type;
  }

  private callApi(req: Parameters<RecommendationService['getRecommendations']>[0]) {
    this.loading.set(true);
    this.error.set(null);

    this.recService.getRecommendations(req).subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.result.set(res.data);
          this.step.set('result');
        } else {
          this.error.set('Failed to get recommendations. Please try again.');
        }
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Unable to connect to the recommendation engine. Please try again.');
        this.loading.set(false);
        this.step.set('start');
      },
    });
  }

  private loadHistory() {
    this.recService.getHistory().subscribe({
      next: (res) => {
        if (res.success) this.history.set(res.data);
      },
      error: () => {
      },
    });
  }

  onPosterError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = 'https://placehold.co/342x513/1a1a2e/6b7280?text=🎬';
    img.onerror = null;
  }
}
