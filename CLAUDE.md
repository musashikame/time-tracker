# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm start      # dev server on http://localhost:4300
npm run build  # production build to dist/time-tracker/browser
npm test       # Karma + Jasmine unit tests (launches Chrome, watch mode)
```

Run a single test suite: there is no test filter flag wired up — temporarily use Jasmine's `fdescribe`/`fit` in the `.spec.ts` to focus, or `npm test -- --include=src/app/path/to/file.spec.ts`.

There is no linter configured. TypeScript is compiled in strict mode (`tsconfig.json`).

## Architecture

Read `ARCHITECTURE.md` first — it is accurate and current. The essentials:

This is a **client-only Angular 18 app with no backend**. Persistence is a single JSON file (`data/db.json` by default) stored in a user-supplied **private GitHub repo**, read/written directly from the browser via the GitHub Contents REST API.

The data flow that ties everything together:

- **`SettingsService`** — the only place the GitHub connection config + personal access token live (in `localStorage`). `settingsGuard` redirects every route except `/settings` here until `isConfigured()` is true.
- **`GitHubDbService`** — the *only* code that talks to GitHub. `load()` base64-decodes `db.json`; `save()` writes it back using the last-seen file SHA and retries once on a 409 conflict; returns an empty DB on 404 so a fresh repo just works.
- **`DataStoreService`** — in-memory source of truth, exposed as signals (`projects`, `entries`, `status`, `error`). CRUD methods update state immediately (optimistic UI) and **debounce the GitHub save by 800ms**, so rapid edits collapse into one commit. Deleting a project also deletes its entries.
- **`TimerService`** — the running timer lives in `localStorage` (survives refresh); `stop()` computes duration and hands a finished `TimeEntry` to `DataStoreService`.

## Conventions that matter here

- **Standalone components only** — no NgModules. New pages are lazy-loaded via `loadComponent` in `app.routes.ts` and should be guarded by `settingsGuard`.
- **Signals for state**, not RxJS `BehaviorSubject`s (RxJS is only used for the save debounce).
- **Hash-based routing** (`/#/tracker`) is deliberate — it lets the app work on GitHub Pages with no server rewrite rule. Don't switch to path-based routing.
- Dates for a `TimeEntry.date` key are `yyyy-MM-dd` **local** time via `toDateKey()` in `timer.service.ts`; `start`/`end` are full ISO datetimes. Reuse `toDateKey` rather than reimplementing date formatting.
- `DataStoreService.ensureLoaded()` never rejects — it reports failure through the `status`/`error` signals (surfaced by `SyncStatusComponent`), so callers keep working offline.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which builds and deploys to GitHub Pages. The access token is never built into the deployed artifact — it is entered at runtime and stored only in the user's browser.
