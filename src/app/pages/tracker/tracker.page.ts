import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStoreService } from '../../services/data-store.service';
import { TimerService } from '../../services/timer.service';
import { toDateKey } from '../../services/timer.service';
import { SyncStatusComponent } from '../../shared/sync-status.component';
import { TimeEntry } from '../../models/time-entry.model';

@Component({
  selector: 'app-tracker-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SyncStatusComponent],
  template: `
    <div class="page">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1>Timer</h1>
        <app-sync-status />
      </div>

      <div class="card" style="text-align:center; padding:2rem;">
        @if (!timer.running()) {
          <div class="field" style="max-width:280px; margin:0 auto 1rem;">
            <label for="project">Project</label>
            <select id="project" name="project" [(ngModel)]="selectedProjectId">
              @for (p of store.projects(); track p.id) {
                <option [value]="p.id">{{ p.name }}</option>
              }
            </select>
          </div>
          <div class="field" style="max-width:400px; margin:0 auto 1rem;">
            <label for="notes">Notes (optional)</label>
            <input id="notes" name="notes" [(ngModel)]="notes" placeholder="What are you working on?" />
          </div>
          <button
            class="btn btn-primary"
            style="font-size:16px; padding:12px 28px;"
            [disabled]="!selectedProjectId"
            (click)="start()"
          >
            ▶ Start
          </button>
          @if (!store.projects().length) {
            <p class="muted">Add a project first on the Projects page.</p>
          }
        } @else {
          <div style="font-size:48px; font-weight:500; letter-spacing:1px;">{{ elapsedLabel() }}</div>
          <div class="muted" style="margin:8px 0 1.5rem;">{{ runningProjectName() }}</div>
          <button class="btn btn-danger" style="font-size:16px; padding:12px 28px;" (click)="stop()">■ Stop</button>
        }
      </div>

      <h2 style="margin-top:2rem;">Today</h2>
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Start</th>
            <th>End</th>
            <th>Duration</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (e of todaysEntries(); track e.id) {
            <tr>
              <td>{{ projectName(e.projectId) }}</td>
              <td>{{ e.start | date: 'HH:mm' }}</td>
              <td>{{ e.end | date: 'HH:mm' }}</td>
              <td>{{ formatMinutes(e.durationMinutes) }}</td>
              <td style="text-align:right;">
                <button class="btn btn-danger" (click)="store.deleteEntry(e.id)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="5" class="muted">No time tracked today yet.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class TrackerPageComponent implements OnInit, OnDestroy {
  selectedProjectId = '';
  notes = '';
  private tick = signal(Date.now());
  private intervalId: ReturnType<typeof setInterval> | null = null;

  constructor(public store: DataStoreService, public timer: TimerService) {}

  async ngOnInit(): Promise<void> {
    await this.store.ensureLoaded();
    if (!this.selectedProjectId && this.store.projects().length) {
      this.selectedProjectId = this.store.projects()[0].id;
    }
    this.intervalId = setInterval(() => this.tick.set(Date.now()), 1000);
  }

  ngOnDestroy(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  start(): void {
    this.timer.start(this.selectedProjectId, this.notes.trim() || undefined);
    this.notes = '';
  }

  stop(): void {
    this.timer.stop();
  }

  elapsedLabel(): string {
    this.tick();
    const running = this.timer.running();
    if (!running) {
      return '00:00:00';
    }
    const ms = Date.now() - new Date(running.startedAt).getTime();
    const totalSeconds = Math.max(0, Math.floor(ms / 1000));
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(totalSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  runningProjectName(): string {
    const running = this.timer.running();
    return running ? this.projectName(running.projectId) : '';
  }

  projectName(id: string): string {
    return this.store.projects().find((p) => p.id === id)?.name ?? 'Unknown project';
  }

  todaysEntries(): TimeEntry[] {
    this.tick();
    const today = toDateKey(new Date());
    return this.store
      .entriesForDate(today)
      .slice()
      .sort((a, b) => b.start.localeCompare(a.start));
  }

  formatMinutes(total: number): string {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}
