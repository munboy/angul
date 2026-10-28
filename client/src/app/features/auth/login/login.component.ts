import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, TranslateModule],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <div class="logo">CineMatch</div>
          <h2>{{ 'AUTH.LOGIN_TITLE' | translate }}</h2>
          <p>{{ 'AUTH.LOGIN_SUBTITLE' | translate }}</p>
        </div>

        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="auth-form">
          @if (errorMessage()) {
            <div class="error-banner">
              {{ errorMessage() }}
            </div>
          }

          <div class="form-field">
            <label for="email">{{ 'AUTH.EMAIL' | translate }}</label>
            <input
              id="email"
              type="email"
              name="email"
              autocomplete="username"
              formControlName="email"
              placeholder="name@example.com"
              [class.error]="isFieldInvalid('email')"
            />
            @if (isFieldInvalid('email')) {
              <span class="error-text">
                {{ getFieldError('email') }}
              </span>
            }
          </div>

          <div class="form-field">
            <label for="password">{{ 'AUTH.PASSWORD' | translate }}</label>
            <input
              id="password"
              type="password"
              name="password"
              autocomplete="current-password"
              formControlName="password"
              placeholder="••••••••"
              [class.error]="isFieldInvalid('password')"
            />
            @if (isFieldInvalid('password')) {
              <span class="error-text">
                {{ getFieldError('password') }}
              </span>
            }
          </div>

          <button type="submit" class="btn-submit" [disabled]="loginForm.invalid || loading()">
            @if (loading()) {
              <span class="spinner"></span>
              {{ 'COMMON.LOADING' | translate }}
            } @else {
              {{ 'AUTH.SUBMIT_LOGIN' | translate }}
            }
          </button>
        </form>

        <div class="auth-footer">
          <p>
            {{ 'AUTH.NO_ACCOUNT' | translate }}
            <a routerLink="/auth/register">{{ 'AUTH.GO_TO_REGISTER' | translate }}</a>
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: radial-gradient(circle at center, #1b1b2f 0%, #0f0f15 100%);
      padding: 20px;
      font-family: 'Outfit', 'Inter', sans-serif;
    }

    .auth-card {
      width: 100%;
      max-width: 440px;
      background: rgba(24, 24, 37, 0.7);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px rgba(255, 255, 255, 0.08) solid;
      border-radius: 20px;
      padding: 40px;
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }

    .auth-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .logo {
      font-size: 28px;
      font-weight: 800;
      background: linear-gradient(135deg, #ff0844 0%, #ffb199 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 15px;
      letter-spacing: -1px;
    }

    h2 {
      color: #ffffff;
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 8px 0;
    }

    p {
      color: #a0aec0;
      font-size: 14px;
      margin: 0;
    }

    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .error-banner {
      background: rgba(254, 68, 68, 0.15);
      border: 1px solid rgba(254, 68, 68, 0.3);
      color: #ff6b6b;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      text-align: center;
    }

    .form-field {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    label {
      color: #e2e8f0;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    input {
      background: rgba(15, 15, 20, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      padding: 14px 16px;
      color: #ffffff;
      font-size: 15px;
      outline: none;
      transition: all 0.3s ease;
    }

    input:focus {
      border-color: #ff0844;
      box-shadow: 0 0 10px rgba(255, 8, 68, 0.2);
    }

    input.error {
      border-color: #ff4444;
    }

    .error-text {
      color: #ff4444;
      font-size: 12px;
      margin-top: 2px;
    }

    .btn-submit {
      background: linear-gradient(135deg, #ff0844 0%, #e0003c 100%);
      color: #ffffff;
      border: none;
      border-radius: 10px;
      padding: 14px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 10px;
      transition: all 0.3s ease;
      box-shadow: 0 4px 15px rgba(255, 8, 68, 0.3);
    }

    .btn-submit:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 8, 68, 0.4);
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      box-shadow: none;
    }

    .spinner {
      width: 18px;
      height: 18px;
      border: 2px solid rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      border-top-color: #ffffff;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .auth-footer {
      text-align: center;
      margin-top: 25px;
      font-size: 14px;
      color: #a0aec0;
    }

    .auth-footer a {
      color: #ff0844;
      text-decoration: none;
      font-weight: 600;
      transition: color 0.2s ease;
    }

    .auth-footer a:hover {
      color: #ff4d6d;
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  isFieldInvalid(field: string): boolean {
    const control = this.loginForm.get(field);
    return control ? control.invalid && control.touched : false;
  }

  getFieldError(field: string): string {
    const control = this.loginForm.get(field);
    if (!control) return '';
    if (control.hasError('required')) return 'This field is required';
    if (control.hasError('email')) return 'Please enter a valid email address';
    if (control.hasError('minlength')) return 'Password must be at least 6 characters';
    return '';
  }

  onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.loginForm.value;

    this.authService.login(email!, password!).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/']);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Invalid email or password.');
        } else {
          this.errorMessage.set('Authentication failed. Please try again.');
        }
      }
    });
  }
}
