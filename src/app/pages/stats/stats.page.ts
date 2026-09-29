import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChartConfiguration } from 'chart.js/auto';
import { DataStoreService } from '../../services/data-store.service';
import { SyncStatusComponent } from '../../shared/sync-status.component';
import { ChartCanvasComponent } from '../../shared/chart-canvas.component';
import { toDateKey } from '../../services/timer.service';

type Range = 7 | 30 | 90;

@Component({
  selector: 'app-stats-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SyncStatusComponent, ChartCanvasComponent],
  template: `
    <div class="page">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1>Overview</h1>
        <app-sync-status />
      </div>

      <div style="margin-bottom:1rem;">
        <select [ngModel]="range()" (ngModelChange)="range.set($event)" style="width:auto;">
          <option [value]="7">Last 7 days</option>
          <option [value]="30">Last 30 days</option>
          <option [value]="90">Last 90 days</option>
        </select>
      </div>

      <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(160px, 1fr)); gap:12px; margin-bottom:1.5rem;">
        <div class="card">
          <div class="muted" style="font-size:13px;">Total tracked</div>
          <div style="font-size:24px; font-weight:500;">{{ totalHours() }} h</div>
        </div>
        <div class="card">
          <div class="muted" style="font-size:13px;">Daily average</div>
          <div style="font-size:24px; font-weight:500;">{{ dailyAverage() }} h</div>
        </div>
        <div class="card">
          <div class="muted" style="font-size:13px;">Top project</div>
          <div style="font-size:24px; font-weight:500;">{{ topProjectName() }}</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:1.5rem;">
        <h3>Hours per day</h3>
        <app-chart-canvas [config]="dailyChartConfig()" ariaLabel="Bar chart of hours tracked per day" />
      </div>

      <div class="card">
        <h3>Hours per project</h3>
        <div style="display:flex; flex-wrap:wrap; gap:16px; margin-bottom:12px; font-size:12px;" class="muted">
          @for (p of projectBreakdown(); track p.name) {
            <span style="display:flex; align-items:center; gap:4px;">
              <span style="width:10px;height:10px;border-radius:2px;" [style.background]="p.color"></span>
              {{ p.name }} — {{ p.hours }}h ({{ p.pct }}%)
            </span>
          }
        </div>
        <app-chart-canvas
          [config]="projectChartConfig()"
          ariaLabel="Doughnut chart of hours tracked per project"
          [height]="260"
        />
      </div>
    </div>
  `,
})
export class StatsPageComponent implements OnInit {
  range = signal<Range>(30);

  constructor(public store: DataStoreService) {}

  async ngOnInit(): Promise<void> {
    await this.store.ensureLoaded();
  }

  private rangeDates = computed(() => {
    const days: string[] = [];
    for (let i = this.range() - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push(toDateKey(d));
    }
    return days;
  });

  private minutesByDay = computed(() => {
    const map = new Map<string, number>();
    for (const key of this.rangeDates()) {
      map.set(key, 0);
    }
    for (const e of this.store.entries()) {
      if (map.has(e.date)) {
        map.set(e.date, (map.get(e.date) ?? 0) + e.durationMinutes);
      }
    }
    return map;
  });

  totalHours(): string {
    const total = [...this.minutesByDay().values()].reduce((a, b) => a + b, 0);
    return (total / 60).toFixed(1);
  }

  dailyAverage(): string {
    const total = [...this.minutesByDay().values()].reduce((a, b) => a + b, 0);
    return (total / 60 / this.range()).toFixed(1);
  }

  private projectMinutes = computed(() => {
    const rangeSet = new Set(this.rangeDates());
    const map = new Map<string, number>();
    for (const e of this.store.entries()) {
      if (rangeSet.has(e.date)) {
        map.set(e.projectId, (map.get(e.projectId) ?? 0) + e.durationMinutes);
      }
    }
    return map;
  });

  topProjectName(): string {
    let bestId: string | null = null;
    let bestMinutes = 0;
    for (const [id, minutes] of this.projectMinutes()) {
      if (minutes > bestMinutes) {
        bestMinutes = minutes;
        bestId = id;
      }
    }
    if (!bestId) {
      return '—';
    }
    return this.store.projects().find((p) => p.id === bestId)?.name ?? '—';
  }

  projectBreakdown = computed<{ name: string; color: string; hours: string; pct: string }[]>(() => {
    const minutesMap = this.projectMinutes();
    const total = [...minutesMap.values()].reduce((a, b) => a + b, 0);
    return this.store
      .projects()
      .map((p) => {
        const minutes = minutesMap.get(p.id) ?? 0;
        return {
          name: p.name,
          color: p.color,
          hours: (minutes / 60).toFixed(1),
          pct: total > 0 ? ((minutes / total) * 100).toFixed(0) : '0',
          minutes,
        };
      })
      .filter((p) => p.minutes > 0)
      .sort((a, b) => b.minutes - a.minutes);
  });

  dailyChartConfig = computed<ChartConfiguration>(() => {
    const map = this.minutesByDay();
    const labels = [...map.keys()];
    const data = labels.map((k) => Number(((map.get(k) ?? 0) / 60).toFixed(2)));
    return {
      type: 'bar',
      data: {
        labels: labels.map((k) => k.slice(5)),
        datasets: [
          {
            label: 'Hours',
            data,
            backgroundColor: '#3266ad',
            borderRadius: 4,
            maxBarThickness: 24,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { autoSkip: true, maxRotation: 45 } },
          y: { beginAtZero: true, grid: { color: '#e1e0d9' } },
        },
      },
    };
  });

  projectChartConfig = computed<ChartConfiguration>(() => {
    const breakdown = this.projectBreakdown();
    return {
      type: 'doughnut',
      data: {
        labels: breakdown.map((p) => p.name),
        datasets: [
          {
            data: breakdown.map((p) => Number(p.hours)),
            backgroundColor: breakdown.map((p) => p.color),
            borderColor: '#ffffff',
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: { legend: { display: false } },
      },
    };
  });
}
