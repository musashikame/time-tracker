# Architecture

TimeTracker is a client-only Angular application — there is no backend
server. All persistence happens by calling the GitHub REST API directly from
the browser and storing everything as one JSON file in a private repo.

```
Browser (Angular app)
   |
   |  GitHub Contents API (REST, over HTTPS)
   v
private GitHub repo  ->  data/db.json  { projects: [...], entries: [...] }
```

## Tech stack

- **Angular 18**, standalone components (no NgModules), signals for state
- **Chart.js** for the Overview charts
- **GitHub REST API** (Contents API) as the database
- No backend, no build-time secrets — deployable as a static site
  (GitHub Pages via `.github/workflows/deploy.yml`)

## Pages (routes)

| Route | Component | Purpose |
|---|---|---|
| `/settings` | [SettingsPageComponent](src/app/pages/settings/settings.page.ts) | Configure the GitHub repo (owner/repo/branch/path) and personal access token; test the connection |
| `/tracker` | [TrackerPageComponent](src/app/pages/tracker/tracker.page.ts) | Pick a project, start/stop the timer, see today's entries |
| `/projects` | [ProjectsPageComponent](src/app/pages/projects/projects.page.ts) | CRUD for projects (name + color), total hours per project |
| `/calendar` | [CalendarPageComponent](src/app/pages/calendar/calendar.page.ts) | Month grid with per-day hours; click a day to edit/delete entries or add one manually |
| `/stats` | [StatsPageComponent](src/app/pages/stats/stats.page.ts) | Hours-per-day bar chart and hours-per-project doughnut chart, over a 7/30/90-day range |

All routes except `/settings` are protected by [settingsGuard](src/app/guards/settings.guard.ts),
which redirects to Settings if no GitHub connection is configured yet.
Routing uses hash-based URLs (`/#/tracker`) so it works on GitHub Pages
without a server-side rewrite rule.

## Services (the app's core logic)

- **[SettingsService](src/app/services/settings.service.ts)** — reads/writes
  the GitHub connection config (owner, repo, branch, path, token) to
  `localStorage`. This is the only place the access token is stored.

- **[GitHubDbService](src/app/services/github-db.service.ts)** — the only
  code that talks to the GitHub API. `load()` fetches and base64-decodes
  `data/db.json`; `save()` writes it back via the Contents API, using the
  last-seen file SHA (refetching and retrying once on a 409 conflict).
  `testConnection()` verifies the token/repo/owner combination without
  touching the data file. Returns an empty DB (rather than erroring) if the
  file doesn't exist yet, so a brand-new repo just works.

- **[DataStoreService](src/app/services/data-store.service.ts)** — the
  in-memory source of truth for the whole app, exposed as Angular signals
  (`projects`, `entries`, `status`, `error`). All CRUD methods
  (`addProject`, `updateEntry`, `deleteEntry`, ...) update the in-memory
  state immediately (optimistic UI) and debounce a save to GitHub 800ms
  later, so rapid edits collapse into one commit instead of one per
  keystroke.

- **[TimerService](src/app/services/timer.service.ts)** — tracks the
  currently running timer (project + start time), persisted to
  `localStorage` so an accidental page refresh doesn't lose it. `stop()`
  computes the duration and hands off a finished entry to
  `DataStoreService`.

## Shared components

- **[ChartCanvasComponent](src/app/shared/chart-canvas.component.ts)** — thin
  wrapper around Chart.js; takes a `ChartConfiguration` object as input and
  (re)renders the chart when it changes. Used by the Overview page for both
  the bar and doughnut charts.
- **[SyncStatusComponent](src/app/shared/sync-status.component.ts)** — the
  small badge shown on every page ("Saving...", "Saved to GitHub", "Sync
  error" with the underlying message).

## Data model

```ts
interface Project {
  id: string;
  name: string;
  color: string;
  archived?: boolean;
}

interface TimeEntry {
  id: string;
  projectId: string;
  date: string;          // yyyy-MM-dd, the day this entry counts toward
  start: string;          // ISO datetime
  end: string;            // ISO datetime
  durationMinutes: number;
  notes?: string;
}

interface Db {
  projects: Project[];
  entries: TimeEntry[];
}
```

See [db.model.ts](src/app/models/db.model.ts), [project.model.ts](src/app/models/project.model.ts),
and [time-entry.model.ts](src/app/models/time-entry.model.ts).

## Why this design

- **No backend** — the entire app is static files, so it costs nothing to
  host and there's no server to maintain or secure.
- **GitHub-as-database** — chosen so a single personal user gets free
  storage, cross-device sync, and a full edit history (every save is a git
  commit) without running any infrastructure. See [README.md](README.md)
  for the setup and the tradeoffs of storing the access token client-side.
- **Optimistic updates + debounced saves** — the UI never blocks on a
  network round-trip; GitHub sync happens in the background and its status
  is always visible via `SyncStatusComponent`.
