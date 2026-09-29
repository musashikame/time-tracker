# TimeTracker

A personal time-tracking app built with Angular. Track time per project with a
start/stop timer, review and edit past entries on a calendar, and see hours
charted over time. There is no backend server — your data is stored as a
single JSON file in a private GitHub repository of your choice, read and
written directly from the browser via the GitHub REST API.

## Features

- Start/stop timer, scoped to a selected project
- Project management (name + color)
- Calendar view — see hours per day, click a day to edit or add entries
- Overview page — hours per day and per project, over the last 7/30/90 days
- Data lives in a GitHub repo (`data/db.json` by default) — versioned, and
  synced across any browser you sign in from

## 1. Create a data repository

Create a **private** GitHub repository to hold your time entries (it can be
empty — the app creates `data/db.json` on first save). This should be a
*different* repo from the one you deploy the app itself from, e.g.
`time-tracker-data`.

## 2. Create a personal access token

Go to [github.com/settings/tokens?type=beta](https://github.com/settings/tokens?type=beta)
and create a **fine-grained token**:

- Repository access: only the data repository you just created
- Permissions: "Contents" → Read and write

Copy the token — you'll paste it into the app's Settings page. It's stored in
your browser's `localStorage`, never sent anywhere except directly to
`api.github.com`.

## 3. Run locally

```bash
npm install
npm start
```

Open `http://localhost:4300`, and you'll be redirected to Settings to enter
the repo owner/name/branch and the token.

## 4. Host it on GitHub Pages

This repo includes `.github/workflows/deploy.yml`, which builds the app and
deploys it to GitHub Pages on every push to `main`.

One-time setup on **this** repository (the app's own code, not the data
repo):

1. Push this project to a GitHub repository.
2. In the repo, go to **Settings → Pages** and set "Source" to
   **GitHub Actions**.
3. Push to `main` — the workflow builds and deploys automatically. Your app
   will be live at `https://<your-username>.github.io/<repo-name>/`.

The app uses hash-based routing (`/#/tracker`, `/#/calendar`, ...) so it works
correctly on GitHub Pages without any server-side rewrite rules.

### Note on the access token and Pages

GitHub Pages only serves static files — there's no server to hide secrets
behind. Your PAT is entered once in the browser and stored in
`localStorage` on your device; it is **not** built into the deployed files
and never leaves your browser except in direct calls to the GitHub API. Since
this is a personal single-user tool, that's an acceptable tradeoff — just
make sure the token is scoped to only the one data repository, and treat
access to your browser profile accordingly.

## Development

```bash
npm start      # dev server on :4300
npm run build  # production build to dist/time-tracker/browser
npm test       # unit tests
```
