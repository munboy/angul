import { Component, OnInit, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AdminService, SyncJobResponse } from './admin.service';
import { NavbarComponent } from '../../shared/components/navbar/navbar.component';
import { SkeletonLoaderComponent } from '../../shared/components/skeleton-loader/skeleton-loader.component';

type AdminTab = 'dashboard' | 'users' | 'sync';

interface StatsData {
  userCount: number;
  movieCount: number;
  favoritesCount: number;
  watchedCount: number;
  recommendationSessionCount: number;
  syncJobCount: number;
}

interface UserListItem {
  id: number;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface AiLogListItem {
  id: number;
  provider: string;
  latencyMs: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  session: {
    userId: number;
    entryType: string;
    user: {
      name: string;
      email: string;
    };
  };
}

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, TranslateModule, NavbarComponent, SkeletonLoaderComponent],
  template: `
    <div class="admin-container">
      <app-navbar></app-navbar>
 
      <main class="admin-content">
        <div class="admin-header">
          <h1 class="page-title">⚙️ {{ 'ADMIN.TITLE' | translate }}</h1>
          <p class="page-subtitle">{{ 'ADMIN.SUBTITLE' | translate }}</p>
        </div>
 
        <div class="tabs-nav">
          <button 
            (click)="setTab('dashboard')" 
            [class.active]="activeTab() === 'dashboard'"
            class="tab-btn"
          >
            📊 {{ 'ADMIN.TAB_DASHBOARD' | translate }}
          </button>
          <button 
            (click)="setTab('users')" 
            [class.active]="activeTab() === 'users'"
            class="tab-btn"
          >
            👥 {{ 'ADMIN.TAB_USERS' | translate }}
          </button>
          <button 
            (click)="setTab('sync')" 
            [class.active]="activeTab() === 'sync'"
            class="tab-btn"
          >
            🔄 {{ 'ADMIN.TAB_SYNC' | translate }}
          </button>
        </div>
 
        <div *ngIf="successMessage()" class="alert alert-success">
          ✓ <ng-container *ngIf="isTranslationObj(successMessage()); else rawText">{{ getTranslationObj(successMessage())!.key | translate:getTranslationObj(successMessage())!.params }}</ng-container>
          <ng-template #rawText>{{ successMessage() }}</ng-template>
        </div>
        <div *ngIf="errorMessage()" class="alert alert-danger">
          ✗ <ng-container *ngIf="isTranslationObj(errorMessage()); else rawError">{{ getTranslationObj(errorMessage())!.key | translate:getTranslationObj(errorMessage())!.params }}</ng-container>
          <ng-template #rawError>{{ errorMessage() }}</ng-template>
        </div>
 
        <div *ngIf="syncing() && activeTab() === 'sync'" class="sync-loader-overlay">
          <div class="spinner"></div>
          <p>{{ 'COMMON.LOADING' | translate }}</p>
        </div>
 
        <div *ngIf="loading() && !syncing()" class="admin-skeleton">
          <app-skeleton-loader type="grid"></app-skeleton-loader>
        </div>
 
        <div class="tab-body" *ngIf="!loading()">
 
          <div *ngIf="activeTab() === 'dashboard'" class="dashboard-pane">
            
            <div class="stats-grid">
              <div class="stat-card">
                <div class="stat-icon">👥</div>
                <div class="stat-details">
                  <span class="stat-num">{{ stats()?.userCount ?? 0 }}</span>
                  <span class="stat-label">{{ 'ADMIN.STATS_USERS' | translate }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🎬</div>
                <div class="stat-details">
                  <span class="stat-num">{{ stats()?.movieCount ?? 0 }}</span>
                  <span class="stat-label">{{ 'ADMIN.STATS_MOVIES' | translate }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">⭐</div>
                <div class="stat-details">
                  <span class="stat-num">{{ stats()?.favoritesCount ?? 0 }}</span>
                  <span class="stat-label">{{ 'ADMIN.STATS_FAVORITES' | translate }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">👁️</div>
                <div class="stat-details">
                  <span class="stat-num">{{ stats()?.watchedCount ?? 0 }}</span>
                  <span class="stat-label">{{ 'ADMIN.STATS_WATCHED' | translate }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🔮</div>
                <div class="stat-details">
                  <span class="stat-num">{{ stats()?.recommendationSessionCount ?? 0 }}</span>
                  <span class="stat-label">{{ 'ADMIN.STATS_RECOMMENDATIONS' | translate }}</span>
                </div>
              </div>
              <div class="stat-card">
                <div class="stat-icon">🔄</div>
                <div class="stat-details">
                  <span class="stat-num">{{ stats()?.syncJobCount ?? 0 }}</span>
                  <span class="stat-label">{{ 'ADMIN.STATS_SYNC_JOBS' | translate }}</span>
                </div>
              </div>
            </div>
 
            <div class="dashboard-columns">
              <div class="dash-card">
                <h3 class="card-title">🔄 {{ 'ADMIN.RECENT_SYNC_JOBS' | translate }}</h3>
                <div class="table-responsive">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Type</th>
                        <th>Status</th>
                        <th>Items</th>
                        <th>Started</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let job of syncJobs()">
                        <td>#{{ job.id }}</td>
                        <td class="job-type-badge">{{ job.type }}</td>
                        <td>
                          <span class="status-badge" [class.completed]="job.status === 'completed'" [class.failed]="job.status === 'failed'">
                            {{ job.status }}
                          </span>
                        </td>
                        <td>{{ job.itemsProcessed }}/{{ job.itemsTotal }}</td>
                        <td>{{ job.startedAt | date:'short' }}</td>
                      </tr>
                      <tr *ngIf="syncJobs().length === 0">
                        <td colspan="5" class="empty-table">{{ 'ADMIN.NO_SYNC_JOBS' | translate }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
 
              <div class="dash-card">
                <h3 class="card-title">🤖 {{ 'ADMIN.AI_LOGS' | translate }}</h3>
                <div class="table-responsive">
                  <table class="admin-table">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Provider</th>
                        <th>Latency</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr *ngFor="let log of aiLogs()">
                        <td>{{ log.session?.user?.name || 'Guest' }}</td>
                        <td>{{ log.provider }}</td>
                        <td>{{ log.latencyMs ? log.latencyMs + 'ms' : '-' }}</td>
                        <td>
                          <span class="status-badge" [class.completed]="log.status === 'success'" [class.failed]="log.status === 'error'">
                            {{ log.status }}
                          </span>
                        </td>
                      </tr>
                      <tr *ngIf="aiLogs().length === 0">
                        <td colspan="4" class="empty-table">{{ 'ADMIN.NO_AI_LOGS' | translate }}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
 
          </div>
 
          <div *ngIf="activeTab() === 'users'" class="users-pane">
            <div class="dash-card">
              <h3 class="card-title">👥 {{ 'ADMIN.TAB_USERS' | translate }}</h3>
              
              <div class="search-row">
                <input
                  type="text"
                  class="form-control search-input"
                  [placeholder]="'ADMIN.USER_SEARCH_PLACEHOLDER' | translate"
                  [ngModel]="usersSearch()"
                  (ngModelChange)="onSearchUsers($event)"
                />
                <span class="user-count">{{ 'ADMIN.USER_TOTAL' | translate:{count: (users()?.length ?? 0)} }}</span>
              </div>

              <div class="table-responsive">
                <table class="admin-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>{{ 'ADMIN.USER_TABLE_NAME' | translate }}</th>
                      <th>{{ 'ADMIN.USER_TABLE_EMAIL' | translate }}</th>
                      <th>{{ 'ADMIN.USER_TABLE_ROLE' | translate }}</th>
                      <th>{{ 'ADMIN.USER_TABLE_STATUS' | translate }}</th>
                      <th>{{ 'ADMIN.USER_TABLE_ACTIONS' | translate }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr *ngFor="let user of users()">
                      <td>#{{ user.id }}</td>
                      <td>{{ user.name }}</td>
                      <td>{{ user.email }}</td>
                      <td class="role-cell">{{ user.role }}</td>
                      <td>
                        <span class="user-status-badge" [class.active]="user.isActive" [class.blocked]="!user.isActive">
                          {{ (user.isActive ? 'ADMIN.USER_ACTIVE' : 'ADMIN.USER_INACTIVE') | translate }}
                        </span>
                      </td>
                      <td>
                        <button 
                          (click)="toggleUserStatus(user)" 
                          class="action-btn"
                          [class.deactivate]="user.isActive"
                          [class.activate]="!user.isActive"
                          [disabled]="user.role === 'admin'"
                        >
                          {{ (user.isActive ? 'ADMIN.USER_DEACTIVATE' : 'ADMIN.USER_ACTIVATE') | translate }}
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
 
              <div class="pagination-row" *ngIf="usersTotalPages() > 1">
                <button 
                  [disabled]="usersPage() === 1" 
                  (click)="changeUsersPage(usersPage() - 1)"
                  class="btn-page"
                >
                  ◀
                </button>
                <span class="page-indicator">{{ 'ADMIN.PAGE_INFO' | translate:{page: usersPage(), total: usersTotalPages()} }}</span>
                <button 
                  [disabled]="usersPage() === usersTotalPages()" 
                  (click)="changeUsersPage(usersPage() + 1)"
                  class="btn-page"
                >
                  ▶
                </button>
              </div>
            </div>
          </div>
 
          <div *ngIf="activeTab() === 'sync'" class="sync-pane">
            <div class="admin-grid">
              <div class="card-column">
                <div class="admin-card">
                  <h3 class="card-title">🔄 {{ 'ADMIN.BULK_SYNC' | translate }}</h3>
                  <p class="card-desc">
                    {{ 'ADMIN.BULK_SYNC_DESC' | translate }}
                  </p>
                  
                  <div class="btn-group">
                    <button 
                      [disabled]="syncing()" 
                      (click)="triggerBulkSync('popular')" 
                      class="btn btn-primary"
                    >
                      {{ 'ADMIN.SYNC_POPULAR' | translate }}
                    </button>
                    <button 
                      [disabled]="syncing()" 
                      (click)="triggerBulkSync('now_playing')" 
                      class="btn btn-secondary"
                    >
                      {{ 'ADMIN.SYNC_NEW' | translate }}
                    </button>
                  </div>
                </div>
 
                <div class="admin-card">
                  <h3 class="card-title">🔍 {{ 'ADMIN.SINGLE_IMPORT' | translate }}</h3>
                  <p class="card-desc">
                    {{ 'ADMIN.SINGLE_IMPORT_DESC' | translate }}
                  </p>
                  
                  <div class="input-group">
                    <input 
                      type="number" 
                      [(ngModel)]="singleTmdbId" 
                      [placeholder]="'ADMIN.SINGLE_IMPORT_PLACEHOLDER' | translate" 
                      class="form-control"
                      [disabled]="syncing()"
                    />
                    <button 
                      [disabled]="syncing() || !singleTmdbId" 
                      (click)="triggerSingleSync()" 
                      class="btn btn-accent"
                    >
                      {{ 'ADMIN.SINGLE_IMPORT_BTN' | translate }}
                    </button>
                  </div>
                </div>
              </div>
 
              <div class="status-column">
                <div class="admin-card status-card">
                  <h3 class="card-title">📊 {{ 'ADMIN.LAST_RUN' | translate }}</h3>
                  
                  <div *ngIf="!lastJob() && !syncing()" class="status-idle">
                    <p>{{ 'ADMIN.SYNC_NOT_RUN' | translate }}</p>
                  </div>
 
                  <div *ngIf="syncing()" class="status-loader">
                    <div class="spinner"></div>
                    <p class="loading-text">{{ 'ADMIN.SYNC_IN_PROGRESS' | translate }}</p>
                  </div>
 
                  <div *ngIf="lastJob()" class="job-stats">
                    <div class="job-header">
                      <span class="status-badge" [class.completed]="lastJob()!.status === 'completed'" [class.running]="lastJob()!.status === 'running'">
                        {{ (lastJob()!.status === 'completed' ? 'ADMIN.JOB_COMPLETED' : 'ADMIN.JOB_RUNNING') | translate }}
                      </span>
                      <span class="job-type">{{ 'ADMIN.JOB_TYPE' | translate:{type: lastJob()!.type} }}</span>
                    </div>
                    
                    <div class="stats-row">
                      <div class="stat-item">
                        <span class="stat-num">{{ lastJob()!.itemsProcessed }}</span>
                        <span class="stat-label">{{ 'ADMIN.JOB_PROCESSED' | translate }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-num error">{{ lastJob()!.itemsFailed }}</span>
                        <span class="stat-label">{{ 'ADMIN.JOB_ERRORS' | translate }}</span>
                      </div>
                      <div class="stat-item">
                        <span class="stat-num">{{ lastJob()!.itemsTotal }}</span>
                        <span class="stat-label">{{ 'ADMIN.JOB_TOTAL' | translate }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
 
        </div>
      </main>
    </div>
  `,
  styles: [`
    .admin-container {
      min-height: 100vh;
      background: #0f0f15;
      color: #ffffff;
      font-family: 'Outfit', 'Inter', sans-serif;
      display: flex;
      flex-direction: column;
    }
 
    .admin-content {
      flex: 1;
      padding: 40px;
      max-width: 1200px;
      width: 100%;
      margin: 0 auto;
    }
 
    .admin-header {
      margin-bottom: 30px;
    }
 
    .page-title {
      font-size: 32px;
      font-weight: 800;
      margin: 0 0 8px 0;
      letter-spacing: -0.5px;
    }
 
    .page-subtitle {
      font-size: 16px;
      color: #a0aec0;
      margin: 0;
    }
 
    .tabs-nav {
      display: flex;
      gap: 12px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding-bottom: 15px;
      margin-bottom: 30px;
    }
 
    .tab-btn {
      padding: 10px 24px;
      background: transparent;
      border: none;
      color: #718096;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.2s ease;
    }
 
    .tab-btn:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.02);
    }
 
    .tab-btn.active {
      color: #ffffff;
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.03);
    }
 
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
 
    .stat-card {
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
 
    .stat-icon {
      font-size: 32px;
    }
 
    .stat-details {
      display: flex;
      flex-direction: column;
    }
 
    .stat-num {
      font-size: 24px;
      font-weight: 800;
    }
 
    .stat-label {
      font-size: 12px;
      color: #718096;
      font-weight: 600;
      text-transform: uppercase;
    }
 
    .dashboard-columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
    }
 
    @media (max-width: 900px) {
      .dashboard-columns {
        grid-template-columns: 1fr;
      }
    }
 
    .dash-card, .admin-card {
      background: #181825;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }
 
    .card-title {
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
 
    .card-desc {
      font-size: 14px;
      color: #a0aec0;
      margin-bottom: 24px;
      line-height: 1.5;
    }
 
    .table-responsive {
      overflow-x: auto;
      width: 100%;
    }
 
    .admin-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
 
    .admin-table th {
      border-bottom: 2px solid rgba(255, 255, 255, 0.05);
      padding: 12px 16px;
      font-size: 12px;
      text-transform: uppercase;
      color: #718096;
      font-weight: 700;
    }
 
    .admin-table td {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      padding: 14px 16px;
      font-size: 14px;
      color: #e2e8f0;
    }
 
    .admin-table tr:hover td {
      background: rgba(255, 255, 255, 0.01);
    }
 
    .empty-table {
      text-align: center;
      color: #718096;
      font-style: italic;
    }
 
    .status-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 193, 7, 0.1);
      color: #ffc107;
      border: 1px solid rgba(255, 193, 7, 0.2);
    }
 
    .status-badge.completed {
      background: rgba(46, 196, 182, 0.1);
      color: #2ec4b6;
      border: 1px solid rgba(46, 196, 182, 0.2);
    }
 
    .status-badge.failed {
      background: rgba(255, 8, 68, 0.1);
      color: #ff0844;
      border: 1px solid rgba(255, 8, 68, 0.2);
    }
 
    .user-status-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 4px;
    }
 
    .user-status-badge.active {
      background: rgba(46, 196, 182, 0.1);
      color: #2ec4b6;
    }
 
    .user-status-badge.blocked {
      background: rgba(255, 8, 68, 0.1);
      color: #ff0844;
    }
 
    .job-type-badge {
      font-family: monospace;
      font-weight: 700;
      color: #7b2cbf;
    }
 
    .role-cell {
      text-transform: uppercase;
      font-weight: 700;
      font-size: 12px;
      color: #a0aec0;
    }
 
    .action-btn {
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
 
    .action-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
 
    .action-btn.deactivate {
      background: rgba(255, 8, 68, 0.15);
      color: #ff0844;
      border: 1px solid rgba(255, 8, 68, 0.3);
    }
 
    .action-btn.deactivate:hover:not(:disabled) {
      background: #ff0844;
      color: #ffffff;
    }
 
    .action-btn.activate {
      background: rgba(46, 196, 182, 0.15);
      color: #2ec4b6;
      border: 1px solid rgba(46, 196, 182, 0.3);
    }
 
    .action-btn.activate:hover:not(:disabled) {
      background: #2ec4b6;
      color: #ffffff;
    }
 
    .btn-group {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
 
    .btn {
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      border: none;
      transition: all 0.2s ease;
    }
 
    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
 
    .btn-primary {
      background: #ff0844;
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(255, 8, 68, 0.2);
    }
 
    .btn-primary:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(255, 8, 68, 0.3);
    }
 
    .btn-secondary {
      background: #2b2b3d;
      color: #ffffff;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
 
    .btn-secondary:hover:not(:disabled) {
      background: #35354a;
    }
 
    .btn-accent {
      background: linear-gradient(135deg, #7b2cbf 0%, #3a0ca3 100%);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(123, 44, 191, 0.25);
    }
 
    .btn-accent:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 16px rgba(123, 44, 191, 0.4);
    }
 
    .input-group {
      display: flex;
      gap: 12px;
    }
 
    .form-control {
      flex: 1;
      background: #0f0f15;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #ffffff;
      padding: 12px 16px;
      font-size: 14px;
      font-weight: 500;
      outline: none;
      transition: border-color 0.2s ease;
    }
 
    .form-control:focus {
      border-color: #ff0844;
    }
 
    .admin-grid {
      display: grid;
      grid-template-columns: 1.2fr 1fr;
      gap: 30px;
    }
 
    @media (max-width: 900px) {
      .admin-grid {
        grid-template-columns: 1fr;
      }
    }
 
    .card-column, .status-column {
      display: flex;
      flex-direction: column;
      gap: 30px;
    }
 
    .status-card {
      min-height: 250px;
      display: flex;
      flex-direction: column;
    }
 
    .status-idle {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #718096;
      font-size: 14px;
    }
 
    .status-loader {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 20px;
    }
 
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid rgba(255, 8, 68, 0.1);
      border-radius: 50%;
      border-top-color: #ff0844;
      animation: spin 1s ease-in-out infinite;
    }
 
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
 
    .loading-text {
      color: #cbd5e0;
      font-size: 14px;
      font-weight: 500;
    }
 
    .job-stats {
      margin-top: 20px;
      background: #0f0f15;
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 12px;
      padding: 20px;
    }
 
    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
 
    .status-badge.running {
      background: rgba(255, 193, 7, 0.1);
      color: #ffc107;
      border: 1px solid #ffc107;
    }
 
    .job-type {
      font-size: 12px;
      color: #a0aec0;
      font-weight: 600;
      text-transform: uppercase;
    }
 
    .stats-row {
      display: flex;
      justify-content: space-around;
      text-align: center;
    }
 
    .stat-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
 
    .stat-num.error {
      color: #ff0844;
    }
 
    .stat-label {
      font-size: 11px;
      color: #718096;
      font-weight: 700;
      text-transform: uppercase;
    }
 
    .alert {
      margin-bottom: 20px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 600;
    }
 
    .alert-success {
      background: rgba(46, 196, 182, 0.1);
      border: 1px solid #2ec4b6;
      color: #2ec4b6;
    }
 
    .alert-danger {
      background: rgba(255, 8, 68, 0.1);
      border: 1px solid #ff0844;
      color: #ff0844;
    }
 
    .sync-loader-overlay {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 15px;
      padding: 40px;
      background: #181825;
      border-radius: 16px;
      border: 1px solid rgba(255, 255, 255, 0.05);
    }
 
    .pagination-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 15px;
      margin-top: 25px;
    }
 
    .btn-page {
      background: #2b2b3d;
      border: 1px solid rgba(255, 255, 255, 0.05);
      color: #ffffff;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: bold;
      transition: background 0.2s ease;
    }
 
    .btn-page:hover:not(:disabled) {
      background: #35354a;
    }
 
    .btn-page:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
 
    .page-indicator {
      font-size: 14px;
      color: #cbd5e0;
      font-weight: 500;
    }

    .admin-skeleton {
      padding: 20px 0;
    }

    .search-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .search-input {
      max-width: 320px;
      padding: 10px 14px;
    }

    .user-count {
      font-size: 13px;
      color: #718096;
      white-space: nowrap;
    }

    @media (max-width: 768px) {
      .admin-content {
        padding: 20px;
      }
      .tabs-nav {
        flex-wrap: wrap;
        gap: 8px;
      }
      .tab-btn {
        flex: 1 1 auto;
        padding: 8px 16px;
        font-size: 14px;
        text-align: center;
      }
      .admin-table th, .admin-table td {
        padding: 8px 10px;
        font-size: 12px;
      }
    }
  `]
})
export class AdminComponent implements OnInit {
  private readonly adminService = inject(AdminService);
  private readonly translate = inject(TranslateService);
  
  readonly activeTab = signal<AdminTab>('dashboard');
  readonly loading = signal<boolean>(true);
  readonly syncing = signal<boolean>(false);
  readonly successMessage = signal<{ key: string, params?: any } | string | null>(null);
  readonly errorMessage = signal<{ key: string, params?: any } | string | null>(null);

  readonly stats = signal<StatsData | null>(null);
  readonly syncJobs = signal<SyncJobResponse[]>([]);
  readonly aiLogs = signal<AiLogListItem[]>([]);

  readonly users = signal<UserListItem[]>([]);
  readonly usersPage = signal<number>(1);
  readonly usersTotalPages = signal<number>(1);
  readonly usersSearch = signal<string>('');

  readonly lastJob = signal<SyncJobResponse | null>(null);
  singleTmdbId?: number;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.successMessage.set(null);
    this.errorMessage.set(null);
    if (this.activeTab() === 'dashboard') {
      this.loadDashboardData();
    } else if (this.activeTab() === 'users') {
      this.loadUsers(1);
    } else if (this.activeTab() === 'sync') {
      this.loadLastJob();
    }
  }

  setTab(tab: AdminTab) {
    this.activeTab.set(tab);
    this.refresh();
  }

  isTranslationObj(msg: any): boolean {
    return msg && typeof msg === 'object' && 'key' in msg;
  }

  getTranslationObj(msg: any): { key: string, params?: any } | null {
    return this.isTranslationObj(msg) ? msg : null;
  }

  loadDashboardData() {
    this.loading.set(true);
    forkJoin({
      stats: this.adminService.getStats(),
      jobs: this.adminService.getSyncJobs(1, 5),
      logs: this.adminService.getAiLogs(1, 5)
    }).subscribe({
      next: (res) => {
        if (res.stats.success) this.stats.set(res.stats.data);
        if (res.jobs.success) this.syncJobs.set(res.jobs.data.items);
        if (res.logs.success) this.aiLogs.set(res.logs.data.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  loadUsers(page: number, search?: string) {
    this.loading.set(true);
    this.adminService.getUsers(page, 10, search ?? this.usersSearch()).subscribe({
      next: (res) => {
        if (res.success) {
          this.users.set(res.data.items);
          this.usersPage.set(res.data.page);
          this.usersTotalPages.set(res.data.totalPages);
        }
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  onSearchUsers(query: string) {
    this.usersSearch.set(query);
    this.loadUsers(1, query);
  }

  changeUsersPage(page: number) {
    if (page < 1 || page > this.usersTotalPages()) return;
    this.loadUsers(page);
  }

  toggleUserStatus(user: UserListItem) {
    const newStatus = !user.isActive;
    this.adminService.updateUserStatus(user.id, newStatus).subscribe({
      next: (res) => {
        if (res.success) {
          user.isActive = newStatus;
          this.successMessage.set({ key: 'ADMIN.FEEDBACK.USER_STATUS_SUCCESS', params: { name: user.name } });
        }
      },
      error: (err) => this.errorMessage.set(err.error?.message || { key: 'ADMIN.FEEDBACK.USER_STATUS_ERROR' })
    });
  }

  loadLastJob() {
    this.adminService.getLastSyncJob().subscribe({
      next: (res) => {
        if (res.success && res.data) this.lastJob.set(res.data);
      },
      error: () => {}
    });
  }

  triggerBulkSync(type: 'popular' | 'now_playing') {
    this.syncing.set(true);
    this.adminService.triggerSync(type).subscribe({
      next: (res) => {
        this.syncing.set(false);
        if (res.success) {
          this.lastJob.set(res.data);
          this.successMessage.set({ key: 'ADMIN.FEEDBACK.SYNC_SUCCESS', params: { type } });
        } else this.errorMessage.set({ key: 'ADMIN.FEEDBACK.SYNC_ERROR' });
      },
      error: (err) => {
        this.syncing.set(false);
        this.errorMessage.set(err.error?.message || { key: 'ADMIN.FEEDBACK.SYNC_NETWORK_ERROR' });
      }
    });
  }

  triggerSingleSync() {
    if (!this.singleTmdbId) return;
    this.syncing.set(true);
    this.adminService.triggerSingleSync(this.singleTmdbId).subscribe({
      next: (res) => {
        this.syncing.set(false);
        if (res.success) {
          this.successMessage.set({ key: 'ADMIN.FEEDBACK.SINGLE_SYNC_SUCCESS', params: { title: res.data.title } });
          this.singleTmdbId = undefined;
        } else this.errorMessage.set({ key: 'ADMIN.FEEDBACK.SINGLE_SYNC_ERROR' });
      },
      error: (err) => {
        this.syncing.set(false);
        this.errorMessage.set(err.error?.message || { key: 'ADMIN.FEEDBACK.SINGLE_SYNC_NOT_FOUND' });
      }
    });
  }
}
