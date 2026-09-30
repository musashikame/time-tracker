import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataStoreService } from '../services/data-store.service';

@Component({
  selector: 'app-sync-status',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge" [style.background]="badgeBg()" [style.color]="badgeColor()">
      {{ label() }}
    </span>
    @if (store.error(); as err) {
      <div class="error-text" style="margin-top:6px;">{{ err }}</div>
    }
  `,
})
export class SyncStatusComponent {
  constructor(public store: DataStoreService) {}

  label(): string {
    switch (this.store.status()) {
      case 'loading':
        return 'Loading…';
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved to GitHub';
      case 'error':
        return 'Sync error';
      default:
        return 'Up to date';
    }
  }

  badgeBg(): string {
    return this.store.status() === 'error' ? '#F4E1E7' : '#EAF7F1';
  }

  badgeColor(): string {
    return this.store.status() === 'error' ? '#7A0E32' : '#1d9e75';
  }
}
