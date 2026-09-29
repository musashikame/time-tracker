import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SettingsService } from '../../services/settings.service';
import { GitHubDbService } from '../../services/github-db.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="page">
      <h1>GitHub connection</h1>
      <p class="muted">
        Your time entries are stored as a JSON file in a GitHub repository, so use a
        <strong>private</strong> repo. Create a
        <a href="https://github.com/settings/tokens?type=beta" target="_blank" rel="noopener">
          fine-grained personal access token
        </a>
        scoped to just that repo, with "Contents" read and write permission.
      </p>

      <div class="card">
        <div class="field">
          <label for="owner">Repository owner</label>
          <input id="owner" name="owner" [(ngModel)]="owner" placeholder="e.g. renatobarahona" />
        </div>
        <div class="field">
          <label for="repo">Repository name</label>
          <input id="repo" name="repo" [(ngModel)]="repo" placeholder="e.g. time-tracker-data" />
        </div>
        <div class="field">
          <label for="branch">Branch</label>
          <input id="branch" name="branch" [(ngModel)]="branch" placeholder="main" />
        </div>
        <div class="field">
          <label for="path">File path</label>
          <input id="path" name="path" [(ngModel)]="path" placeholder="data/db.json" />
        </div>
        <div class="field">
          <label for="token">Personal access token</label>
          <input id="token" name="token" type="password" [(ngModel)]="token" placeholder="github_pat_..." />
        </div>

        @if (testMessage()) {
          <p [class]="testOk() ? 'success-text' : 'error-text'">{{ testMessage() }}</p>
        }

        <div style="display:flex; gap:8px;">
          <button class="btn" (click)="test()" [disabled]="testing()">
            {{ testing() ? 'Testing…' : 'Test connection' }}
          </button>
          <button class="btn btn-primary" (click)="save()" [disabled]="!canSave()">Save &amp; continue</button>
        </div>
      </div>
    </div>
  `,
})
export class SettingsPageComponent {
  owner = '';
  repo = '';
  branch = 'main';
  path = 'data/db.json';
  token = '';

  testing = signal(false);
  testOk = signal(false);
  testMessage = signal<string | null>(null);

  constructor(private settings: SettingsService, private githubDb: GitHubDbService, private router: Router) {
    const current = settings.settings();
    if (current) {
      this.owner = current.owner;
      this.repo = current.repo;
      this.branch = current.branch;
      this.path = current.path;
      this.token = current.token;
    }
  }

  canSave(): boolean {
    return !!(this.owner && this.repo && this.branch && this.path && this.token);
  }

  async test(): Promise<void> {
    this.testing.set(true);
    this.testMessage.set(null);
    try {
      await this.githubDb.testConnection({
        token: this.token,
        owner: this.owner,
        repo: this.repo,
        branch: this.branch,
      });
      this.testOk.set(true);
      this.testMessage.set('Connected successfully.');
    } catch (err) {
      this.testOk.set(false);
      this.testMessage.set(err instanceof Error ? err.message : 'Connection failed.');
    } finally {
      this.testing.set(false);
    }
  }

  save(): void {
    this.settings.save({
      owner: this.owner.trim(),
      repo: this.repo.trim(),
      branch: this.branch.trim() || 'main',
      path: this.path.trim() || 'data/db.json',
      token: this.token.trim(),
    });
    this.router.navigateByUrl('/tracker');
  }
}
