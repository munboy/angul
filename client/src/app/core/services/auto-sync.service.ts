import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, NavigationEnd } from '@angular/router';
import { filter, throttleTime } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AutoSyncService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly url = `${environment.apiUrl}/movies/auto-sync`;

  init(): void {
    this.ping();

    this.router.events.pipe(
      filter((e) => e instanceof NavigationEnd),
      throttleTime(30 * 60 * 1000),
    ).subscribe(() => this.ping());
  }

  private ping(): void {
    this.http.post(this.url, {}).subscribe({ error: () => {} });
  }
}
