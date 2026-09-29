import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime } from 'rxjs/operators';
import { Db, emptyDb } from '../models/db.model';
import { Project } from '../models/project.model';
import { TimeEntry } from '../models/time-entry.model';
import { GitHubDbService } from './github-db.service';

export type SyncStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

@Injectable({ providedIn: 'root' })
export class DataStoreService {
  private readonly db = signal<Db>(emptyDb());
  readonly projects = computed(() => this.db().projects);
  readonly entries = computed(() => this.db().entries);

  readonly status = signal<SyncStatus>('idle');
  readonly error = signal<string | null>(null);

  private loaded = false;
  private readonly saveRequested = new Subject<string>();

  constructor(private githubDb: GitHubDbService) {
    this.saveRequested.pipe(debounceTime(800)).subscribe((message) => this.persist(message));
  }

  /**
   * Never rejects — callers await this purely to know loading has settled, and
   * keep working (with whatever is in `db`) even when the GitHub fetch failed.
   * Failure is reported through `status`/`error`, not via a thrown rejection.
   */
  async ensureLoaded(): Promise<void> {
    if (this.loaded) {
      return;
    }
    this.status.set('loading');
    this.error.set(null);
    try {
      const db = await this.githubDb.load();
      this.db.set(db);
      this.loaded = true;
      this.status.set('idle');
    } catch (err) {
      this.status.set('error');
      this.error.set(err instanceof Error ? err.message : 'Failed to load data from GitHub.');
    }
  }

  // --- Projects ---

  addProject(project: Omit<Project, 'id'>): Project {
    const created: Project = { ...project, id: crypto.randomUUID() };
    this.db.update((db) => ({ ...db, projects: [...db.projects, created] }));
    this.requestSave(`Add project ${created.name}`);
    return created;
  }

  updateProject(id: string, changes: Partial<Project>): void {
    this.db.update((db) => ({
      ...db,
      projects: db.projects.map((p) => (p.id === id ? { ...p, ...changes } : p)),
    }));
    this.requestSave(`Update project ${id}`);
  }

  deleteProject(id: string): void {
    this.db.update((db) => ({
      ...db,
      projects: db.projects.filter((p) => p.id !== id),
      entries: db.entries.filter((e) => e.projectId !== id),
    }));
    this.requestSave(`Delete project ${id}`);
  }

  // --- Time entries ---

  addEntry(entry: Omit<TimeEntry, 'id'>): TimeEntry {
    const created: TimeEntry = { ...entry, id: crypto.randomUUID() };
    this.db.update((db) => ({ ...db, entries: [...db.entries, created] }));
    this.requestSave(`Add time entry on ${created.date}`);
    return created;
  }

  updateEntry(id: string, changes: Partial<TimeEntry>): void {
    this.db.update((db) => ({
      ...db,
      entries: db.entries.map((e) => (e.id === id ? { ...e, ...changes } : e)),
    }));
    this.requestSave(`Update time entry ${id}`);
  }

  deleteEntry(id: string): void {
    this.db.update((db) => ({ ...db, entries: db.entries.filter((e) => e.id !== id) }));
    this.requestSave(`Delete time entry ${id}`);
  }

  entriesForDate(date: string): TimeEntry[] {
    return this.entries().filter((e) => e.date === date);
  }

  private requestSave(message: string): void {
    this.saveRequested.next(message);
  }

  private async persist(message: string): Promise<void> {
    this.status.set('saving');
    this.error.set(null);
    try {
      await this.githubDb.save(this.db(), message);
      this.status.set('saved');
    } catch (err) {
      this.status.set('error');
      this.error.set(err instanceof Error ? err.message : 'Failed to save data to GitHub.');
    }
  }
}
