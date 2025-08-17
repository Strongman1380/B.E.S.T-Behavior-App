# Bright Track - Student Behavior Tracking System

A standalone student behavior tracking application built with React and Vite.
Runs standalone in the browser (defaulting to localStorage) but includes optional adapters for Firebase, SQLite, and PostgreSQL when run in a server context.

## Running the app

```bash
npm install
npm run dev
```

## Building the app

```bash
# Standard production build (root hosting)
npm run build

# GitHub Pages build (served from /<repo>/ path)
npm run build:pages
```

## Deployment (GitHub Pages)

1. Ensure `vite.config.js` base logic is present (already included) so assets resolve under `/<repo>/`.
2. Push code to a repository with a `main` branch.
3. The included workflow at `.github/workflows/pages.yml` builds and deploys automatically on pushes to `main`.
4. After the first run, visit the repository Settings → Pages to confirm the site URL.

Manual alternative (no Actions): build with `npm run build:pages` and publish the `dist/` folder as the Pages source (if using the classic workflow or a separate branch strategy).

## Features

- **Student Management**: Add, edit, and track student information
- **Daily Evaluations**: Time-slot based behavior scoring system
- **Quick Score Mode**: Streamlined interface for rapid evaluations
- **Progress Tracking**: Visual dashboards and progress indicators
- **Reporting**: Print evaluations and behavior summaries
- **Local Storage**: All data stored locally in browser - works offline

## Data Storage

By default the app uses browser localStorage so it works offline immediately. A hybrid storage layer can promote reads/writes to PostgreSQL / SQLite / Firebase when those backends are available server-side; in the browser only the safe local layer is active. To reset local demo data you can clear site storage or use the provided `reset-data.js` script (run in a Node context to wipe local artifacts when automating tests).

No secrets are bundled client-side—be sure any server deployment supplies `DATABASE_URL` / `POSTGRES_URL` environment variables only on the server process, never in the static build.