import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DataStoreService } from '../../services/data-store.service';
import { SyncStatusComponent } from '../../shared/sync-status.component';

const PALETTE = ['#139EAD', '#5866E3', '#70DC51', '#F5B510', '#D74B94', '#8B5CF6', '#E07B39', '#5C7A99'];

@Component({
  selector: 'app-projects-page',
  standalone: true,
  imports: [CommonModule, FormsModule, SyncStatusComponent],
  template: `
    <div class="page">
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <h1>Projects</h1>
        <app-sync-status />
      </div>

      <div class="card" style="margin-bottom:1.5rem;">
        <h3>New project</h3>
        <div style="display:flex; gap:10px; align-items:flex-end; flex-wrap:wrap;">
          <div class="field" style="margin-bottom:0; flex:1; min-width:200px;">
            <label for="name">Name</label>
            <input id="name" name="name" [(ngModel)]="newName" placeholder="e.g. Acme website" />
          </div>
          <div class="field" style="margin-bottom:0;">
            <label>Color</label>
            <div style="display:flex; gap:6px;">
              @for (c of palette; track c) {
                <button
                  type="button"
                  (click)="newColor.set(c)"
                  [style.background]="c"
                  [style.outline]="newColor() === c ? '2px solid #1A1A1A' : 'none'"
                  style="width:24px;height:24px;border-radius:50%;border:none;cursor:pointer;"
                  [attr.aria-label]="'Pick color ' + c"
                ></button>
              }
            </div>
          </div>
          <button class="btn btn-primary" (click)="add()" [disabled]="!newName.trim()">Add project</button>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Total time</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          @for (p of store.projects(); track p.id) {
            <tr>
              <td>
                <span class="badge" [style.background]="p.color + '1A'" [style.color]="p.color">
                  {{ p.name }}
                </span>
              </td>
              <td>{{ totalHours(p.id) }} h</td>
              <td style="text-align:right;">
                <button class="btn btn-danger" (click)="remove(p.id)">Delete</button>
              </td>
            </tr>
          } @empty {
            <tr>
              <td colspan="3" class="muted">No projects yet — add your first one above.</td>
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
})
export class ProjectsPageComponent implements OnInit {
  palette = PALETTE;
  newName = '';
  newColor = signal(PALETTE[0]);

  constructor(public store: DataStoreService) {}

  async ngOnInit(): Promise<void> {
    await this.store.ensureLoaded();
  }

  add(): void {
    const name = this.newName.trim();
    if (!name) {
      return;
    }
    this.store.addProject({ name, color: this.newColor() });
    this.newName = '';
  }

  remove(id: string): void {
    if (confirm('Delete this project and all its time entries?')) {
      this.store.deleteProject(id);
    }
  }

  totalHours(projectId: string): string {
    const minutes = this.store
      .entries()
      .filter((e) => e.projectId === projectId)
      .reduce((sum, e) => sum + e.durationMinutes, 0);
    return (minutes / 60).toFixed(1);
  }
}
