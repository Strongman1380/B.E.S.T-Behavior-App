# Supabase Configuration

## For GitHub Pages Deployment

To connect your deployed app to Supabase, you'll need to configure environment variables in your GitHub repository:

### 1. Get Your Supabase Configuration

From your Supabase project dashboard:
- **URL**: `https://teiupxwqnbwopnixulay.supabase.co`
- **Anon Public Key**: Found in Settings → API → anon public key
- **PostgreSQL Connection**: `postgresql://postgres:[YOUR-PASSWORD]@db.teiupxwqnbwopnixulay.supabase.co:5432/postgres`

### 2. Configure GitHub Secrets

Go to your repository Settings → Secrets and variables → Actions, and add:

```
VITE_SUPABASE_URL=https://teiupxwqnbwopnixulay.supabase.co
VITE_SUPABASE_ANON_KEY=[your-anon-public-key]
```

### 3. Update GitHub Actions Workflow

The workflow needs to pass these as build environment variables. Edit `.github/workflows/pages.yml`:

```yaml
- name: Build (GitHub Pages base)
  run: npm run build:pages
  env:
    GITHUB_PAGES: '1'
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
```

### 4. Frontend uses Supabase directly (no /api)

This app now connects to Supabase directly from the browser. On GitHub Pages there is no server, so all previous `/api/*` calls have been removed/guarded. Ensure your Row Level Security (RLS) policies allow the anon role read/write that you expect.

If you need server-only operations (service role), deploy the `api/*` folder to Vercel or another server separately. GitHub Pages won’t serve those endpoints.

### 5. For Server-Side (Optional)

If running the server component, you can also set (not required for GitHub Pages):
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.teiupxwqnbwopnixulay.supabase.co:5432/postgres
```

## Database Schema

Run the provided SQL to create tables and permissive RLS policies:

- Open your project → SQL Editor
- Paste contents of `supabase-schema.sql` and run

This creates tables: `students`, `daily_evaluations`, `settings`, `contact_logs`, `incident_reports`, `behavior_summaries`, `users`, enables RLS, and adds anon policies suitable for a Pages-only demo. Adjust policies for production.

## Security Notes

- Never commit passwords or service role keys to Git
- Only use the anon public key in browser builds
- The anon public key is safe to expose in client-side code when properly configured with Row Level Security (RLS)

## Troubleshooting

- Console shows: “Supabase client not configured: missing URL or anon key”
  - Add repository secrets `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` and re-deploy.
  - For local dev, add them to `.env` (see `.env.example`).

- Insert fails with: "new row violates row-level security policy"
  - Your tables likely have RLS enabled but no permissive policy/privileges for `anon`.
  - In the Supabase SQL Editor, run the updated `supabase-schema.sql` which includes:
    - RLS policies for `SELECT/INSERT/UPDATE/DELETE` to the `anon` role (demo only)
    - Grants for `anon`/`authenticated` on the `public` schema, tables, and sequences
  - Re-run the insert after applying the SQL.

- “No routes matched location "/B.E.S.T-Behavior-App/"”
  - The app uses HashRouter on GitHub Pages. Open it at `https://<user>.github.io/B.E.S.T-Behavior-App/#/` and deep links like `#/BehaviorDashboard` work without server support.
