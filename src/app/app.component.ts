import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { SettingsService } from './services/settings.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    @if (settings.isConfigured()) {
      <nav
        style="display:flex; gap:4px; padding:0 1.5rem; background:#fff; border-bottom:1px solid #E5E5E5;"
      >
        <a routerLink="/tracker" routerLinkActive="active" class="nav-link">Timer</a>
        <a routerLink="/calendar" routerLinkActive="active" class="nav-link">Calendar</a>
        <a routerLink="/stats" routerLinkActive="active" class="nav-link">Overview</a>
        <a routerLink="/projects" routerLinkActive="active" class="nav-link">Projects</a>
        <a routerLink="/settings" routerLinkActive="active" class="nav-link" style="margin-left:auto;">Settings</a>
      </nav>
    }
    <router-outlet />
  `,
  styles: [
    `
      .nav-link {
        font-family: "Saira", system-ui, sans-serif;
        font-weight: 500;
        padding: 14px 12px;
        color: #6F6F6F;
        text-decoration: none;
        font-size: 14px;
        border-bottom: 2px solid transparent;
      }
      .nav-link.active {
        color: #1A1A1A;
        border-bottom-color: #A01441;
      }
    `,
  ],
})
export class AppComponent {
  constructor(public settings: SettingsService) {}
}
