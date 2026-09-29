import { Injectable, signal } from '@angular/core';

export interface GitHubSettings {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  path: string;
}

const STORAGE_KEY = 'time-tracker.github-settings';

const DEFAULTS: Omit<GitHubSettings, 'token' | 'owner' | 'repo'> = {
  branch: 'main',
  path: 'data/db.json',
};

@Injectable({ providedIn: 'root' })
export class SettingsService {
  readonly settings = signal<GitHubSettings | null>(this.load());

  isConfigured(): boolean {
    const s = this.settings();
    return !!(s && s.token && s.owner && s.repo);
  }

  save(partial: Partial<GitHubSettings>): void {
    const current = this.settings() ?? { token: '', owner: '', repo: '', ...DEFAULTS };
    const next: GitHubSettings = { ...current, ...partial };
    this.settings.set(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  clear(): void {
    this.settings.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private load(): GitHubSettings | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as GitHubSettings;
    } catch {
      return null;
    }
  }
}
