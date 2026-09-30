import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStoreService } from '../../services/data-store.service';
import { SyncStatusComponent } from '../../shared/sync-status.component';
import { toDateKey } from '../../services/timer.service';
import { TimeEntry } from '../../models/time-entry.model';

interface DayCell {
  date: Date;
  key: string;
  inMonth: boolean;
  isToday: boolean;
  hours: number;
}

@Component({
  selector: 'app-calendar-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SyncStatusComponent],
  template: `
    <div class="page">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1>Calendar</h1>
        <app-sync-status />
      </div>

      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem;">
        <button class="btn" (click)="prevMonth()">‹ Prev</button>
        <h2>{{ monthLabel() }}</h2>
        <button class="btn" (click)="nextMonth()">Next ›</button>
      </div>

      <div class="card">
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px; margin-bottom:6px;">
          @for (d of weekdayLabels; track d) {
            <div class="muted" style="text-align:center; font-size:12px;">{{ d }}</div>
          }
        </div>
        <div style="display:grid; grid-template-columns:repeat(7, 1fr); gap:4px;">
          @for (cell of days(); track cell.key) {
            <button
              type="button"
              (click)="selectDay(cell.key)"
              style="border:none; border-radius:6px; padding:8px 4px; min-height:56px; cursor:pointer; text-align:left;"
              [style.background]="cell.key === selectedKey() ? '#F4E1E7' : 'transparent'"
              [style.opacity]="cell.inMonth ? 1 : 0.35"
            >
              <div [style.font-weight]="cell.isToday ? 700 : 400">{{ cell.date.getDate() }}</div>
              @if (cell.hours > 0) {
                <div style="font-size:12px; color:#A01441; font-weight:600;">{{ cell.hours.toFixed(1) }}h</div>
              }
            </button>
          }
        </div>
      </div>

      @if (selectedKey(); as key) {
        <div class="card" style="margin-top:1.5rem;">
          <h3>{{ key }}</h3>

          <table style="margin-bottom:1rem;">
            <thead>
              <tr>
                <th>Project</th>
                <th>Start</th>
                <th>End</th>
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              @for (e of selectedEntries(); track e.id) {
                <tr>
                  <td>
                    <select [ngModel]="e.projectId" (ngModelChange)="updateEntry(e.id, { projectId: $event })">
                      @for (p of store.projects(); track p.id) {
                        <option [value]="p.id">{{ p.name }}</option>
                      }
                    </select>
                  </td>
                  <td>
                    <input
                      type="time"
                      [ngModel]="timeInputValue(e.start)"
                      (ngModelChange)="updateEntryTime(e, 'start', $event)"
                    />
                  </td>
                  <td>
                    <input
                      type="time"
                      [ngModel]="timeInputValue(e.end)"
                      (ngModelChange)="updateEntryTime(e, 'end', $event)"
                    />
                  </td>
                  <td>
                    <input [ngModel]="e.notes" (ngModelChange)="updateEntry(e.id, { notes: $event })" />
                  </td>
                  <td style="text-align:right;">
                    <button class="btn btn-danger" (click)="store.deleteEntry(e.id)">Delete</button>
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="5" class="muted">No entries this day.</td>
                </tr>
              }
            </tbody>
          </table>

          <h4>Add manual entry</h4>
          <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
            <div class="field" style="margin-bottom:0;">
              <label for="np">Project</label>
              <select id="np" name="np" [(ngModel)]="newProjectId">
                @for (p of store.projects(); track p.id) {
                  <option [value]="p.id">{{ p.name }}</option>
                }
              </select>
            </div>
            <div class="field" style="margin-bottom:0;">
              <label for="ns">Start</label>
              <input id="ns" name="ns" type="time" [(ngModel)]="newStart" />
            </div>
            <div class="field" style="margin-bottom:0;">
              <label for="ne">End</label>
              <input id="ne" name="ne" type="time" [(ngModel)]="newEnd" />
            </div>
            <button class="btn btn-primary" (click)="addManualEntry(key)" [disabled]="!canAddManual()">Add</button>
          </div>
        </div>
      }
    </div>
  `,
})
export class CalendarPageComponent implements OnInit {
  weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  viewMonth = signal(startOfMonth(new Date()));
  selectedKey = signal<string | null>(null);

  newProjectId = '';
  newStart = '';
  newEnd = '';

  days = computed<DayCell[]>(() => {
    const month = this.viewMonth();
    const first = startOfMonth(month);
    const startOffset = (first.getDay() + 6) % 7; // Monday = 0
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);

    const todayKey = toDateKey(new Date());
    const cells: DayCell[] = [];
    for (let i = 0; i < 42; i++) {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + i);
      const key = toDateKey(date);
      cells.push({
        date,
        key,
        inMonth: date.getMonth() === month.getMonth(),
        isToday: key === todayKey,
        hours: this.hoursFor(key),
      });
    }
    return cells;
  });

  selectedEntries = computed<TimeEntry[]>(() => {
    const key = this.selectedKey();
    if (!key) {
      return [];
    }
    return this.store
      .entriesForDate(key)
      .slice()
      .sort((a, b) => a.start.localeCompare(b.start));
  });

  constructor(public store: DataStoreService) {}

  async ngOnInit(): Promise<void> {
    await this.store.ensureLoaded();
    if (this.store.projects().length) {
      this.newProjectId = this.store.projects()[0].id;
    }
    this.selectDay(toDateKey(new Date()));
  }

  monthLabel(): string {
    return this.viewMonth().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  }

  prevMonth(): void {
    const m = this.viewMonth();
    this.viewMonth.set(new Date(m.getFullYear(), m.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const m = this.viewMonth();
    this.viewMonth.set(new Date(m.getFullYear(), m.getMonth() + 1, 1));
  }

  selectDay(key: string): void {
    this.selectedKey.set(key);
  }

  hoursFor(key: string): number {
    const minutes = this.store
      .entriesForDate(key)
      .reduce((sum, e) => sum + e.durationMinutes, 0);
    return minutes / 60;
  }

  updateEntry(id: string, changes: Partial<TimeEntry>): void {
    this.store.updateEntry(id, changes);
  }

  timeInputValue(iso: string): string {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  updateEntryTime(entry: TimeEntry, field: 'start' | 'end', hhmm: string): void {
    const [h, m] = hhmm.split(':').map(Number);
    const base = new Date(entry[field]);
    base.setHours(h, m, 0, 0);
    const newIso = base.toISOString();
    const start = field === 'start' ? newIso : entry.start;
    const end = field === 'end' ? newIso : entry.end;
    const durationMinutes = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000));
    this.store.updateEntry(entry.id, { [field]: newIso, durationMinutes } as Partial<TimeEntry>);
  }

  canAddManual(): boolean {
    return !!(this.newProjectId && this.newStart && this.newEnd);
  }

  addManualEntry(dateKey: string): void {
    const [sh, sm] = this.newStart.split(':').map(Number);
    const [eh, em] = this.newEnd.split(':').map(Number);
    const [y, mo, d] = dateKey.split('-').map(Number);
    const start = new Date(y, mo - 1, d, sh, sm);
    const end = new Date(y, mo - 1, d, eh, em);
    const durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
    this.store.addEntry({
      projectId: this.newProjectId,
      date: dateKey,
      start: start.toISOString(),
      end: end.toISOString(),
      durationMinutes,
    });
    this.newStart = '';
    this.newEnd = '';
  }
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
