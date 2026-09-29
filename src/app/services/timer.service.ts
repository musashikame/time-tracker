import { Injectable, signal } from '@angular/core';
import { DataStoreService } from './data-store.service';

export interface RunningTimer {
  projectId: string;
  startedAt: string; // ISO datetime
  notes?: string;
}

const STORAGE_KEY = 'time-tracker.running-timer';

@Injectable({ providedIn: 'root' })
export class TimerService {
  readonly running = signal<RunningTimer | null>(this.load());

  constructor(private dataStore: DataStoreService) {}

  start(projectId: string, notes?: string): void {
    if (this.running()) {
      return;
    }
    const timer: RunningTimer = { projectId, startedAt: new Date().toISOString(), notes };
    this.running.set(timer);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(timer));
  }

  stop(): void {
    const timer = this.running();
    if (!timer) {
      return;
    }
    const start = new Date(timer.startedAt);
    const end = new Date();
    const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));

    this.dataStore.addEntry({
      projectId: timer.projectId,
      date: toDateKey(start),
      start: start.toISOString(),
      end: end.toISOString(),
      durationMinutes,
      notes: timer.notes,
    });

    this.running.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  discard(): void {
    this.running.set(null);
    localStorage.removeItem(STORAGE_KEY);
  }

  private load(): RunningTimer | null {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      return JSON.parse(raw) as RunningTimer;
    } catch {
      return null;
    }
  }
}

export function toDateKey(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
