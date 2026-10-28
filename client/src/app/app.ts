import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AutoSyncService } from './core/services/auto-sync.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  protected readonly title = signal('client');
  private readonly translate = inject(TranslateService);
  private readonly autoSync = inject(AutoSyncService);

  ngOnInit() {
    const savedLang = localStorage.getItem('lang') || 'uk';
    this.translate.setDefaultLang('uk');
    this.translate.use(savedLang);

    this.autoSync.init();
  }
}
