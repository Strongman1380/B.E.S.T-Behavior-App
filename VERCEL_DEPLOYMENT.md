# Vercel Deployment Guide for Bright Track

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Supabase Database**: Your database is already configured
3. **GitHub Repository**: Push your code to GitHub

## Deployment Steps

### 1. Connect to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Select the repository containing Bright Track

### 2. Configure Environment Variables

In your Vercel project settings, add these environment variables:

```
# If you deploy serverless API routes that connect directly to Postgres
DATABASE_URL=postgres://<user>:<password>@<host>:5432/postgres?sslmode=require
POSTGRES_URL=postgres://<user>:<password>@<host>:5432/postgres?sslmode=require
POSTGRES_PRISMA_URL=postgres://<user>:<password>@<host>:6543/postgres?sslmode=require&pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://<user>:<password>@<host>:5432/postgres?sslmode=require

# Supabase project URL
# For Vite builds, prefer VITE_* variables
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-anon-public-key>

# If you also expose NEXT_PUBLIC_* for other tooling, they are accepted too
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>

# WARNING: Never expose the service role key to the client
# Only set this in server-side environments if needed by API routes
# SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

NODE_ENV=production
```

### 3. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at `https://your-project-name.vercel.app`

### 4. Initialize Database (First Time Only)

Run the SQL from `supabase-schema.sql` in your Supabase SQL Editor to create tables and permissive demo RLS policies. Do not run server endpoints that require service role keys in the browser.

## Project Structure

- `/api/` - Vercel serverless functions (API endpoints)
- `/src/` - React application source code
- `/dist/` - Built application (generated during deployment)
- `vercel.json` - Vercel configuration

## API Endpoints

If you choose to deploy serverless API routes, add endpoints under `/api` and connect them to your database using `DATABASE_URL`. The browser app already uses Supabase directly and does not require these routes.

## Troubleshooting

1. **Database Connection Issues**: Check that all environment variables are set correctly
2. **Build Failures**: Ensure all dependencies are listed in package.json
3. **API Errors**: Check Vercel function logs in the dashboard

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev
```

The app runs at `http://localhost:5173`.

Security note: Do not commit `.env.local` or any secrets.
