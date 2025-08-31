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

### 4. For Server-Side (Optional)

If running the server component, you can also set:
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.teiupxwqnbwopnixulay.supabase.co:5432/postgres
```

## Database Schema

The app will automatically create the required tables when it connects to Supabase PostgreSQL.

## Security Notes

- Never commit passwords or service role keys to Git
- Only use the anon public key in browser builds
- The anon public key is safe to expose in client-side code when properly configured with Row Level Security (RLS)