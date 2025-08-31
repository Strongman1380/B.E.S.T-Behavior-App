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
DATABASE_URL=postgres://postgres.teiupxwqnbwopnixulay:6KtZWVPWboEbtb3o@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
POSTGRES_URL=postgres://postgres.teiupxwqnbwopnixulay:6KtZWVPWboEbtb3o@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
POSTGRES_PRISMA_URL=postgres://postgres.teiupxwqnbwopnixulay:6KtZWVPWboEbtb3o@aws-1-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true
POSTGRES_URL_NON_POOLING=postgres://postgres.teiupxwqnbwopnixulay:6KtZWVPWboEbtb3o@aws-1-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require
SUPABASE_URL=https://teiupxwqnbwopnixulay.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://teiupxwqnbwopnixulay.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlaXVweHdxbmJ3b3BuaXh1bGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NzIwNTcsImV4cCI6MjA3MjE0ODA1N30._3KGRAQLatX52dDQAQei90b1MjXeB2dRsvZb_B6txrk
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlaXVweHdxbmJ3b3BuaXh1bGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY1NzIwNTcsImV4cCI6MjA3MjE0ODA1N30._3KGRAQLatX52dDQAQei90b1MjXeB2dRsvZb_B6txrk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlaXVweHdxbmJ3b3BuaXh1bGF5Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjU3MjA1NywiZXhwIjoyMDcyMTQ4MDU3fQ.oqPdjXMmUSwjxQxpA-ZfxbQ5CmNdcDfKeH_xj-3DH6k
SUPABASE_JWT_SECRET=GXJFGzeaq38ZVWhQ1EiI1wVjdH27PZJR6+jOmh7lfk6haoB/5yFLXOWbYB6ioo+pCu3sdKsAvDsve4XG4kc0vA==
NODE_ENV=production
NODE_TLS_REJECT_UNAUTHORIZED=0
POSTGRES_HOST=db.teiupxwqnbwopnixulay.supabase.co
POSTGRES_USER=postgres
POSTGRES_PASSWORD=6KtZWVPWboEbtb3o
POSTGRES_DATABASE=postgres
```

### 3. Deploy

1. Click "Deploy" in Vercel
2. Wait for the build to complete
3. Your app will be available at `https://your-project-name.vercel.app`

### 4. Initialize Database (First Time Only)

After deployment, visit:
```
https://your-project-name.vercel.app/api/init
```

This will set up the database schema and sample data.

## Project Structure

- `/api/` - Vercel serverless functions (API endpoints)
- `/src/` - React application source code
- `/dist/` - Built application (generated during deployment)
- `vercel.json` - Vercel configuration

## API Endpoints

- `GET /api/status` - Check database and server status
- `POST /api/init` - Initialize database schema
- `GET /api/students` - List all students
- `POST /api/students` - Create new student
- `GET /api/students/[id]` - Get specific student
- `PUT /api/students/[id]` - Update student
- `DELETE /api/students/[id]` - Delete student
- `GET /api/evaluations` - List all evaluations
- `POST /api/evaluations` - Create new evaluation
- `GET /api/evaluations/student/[studentId]` - Get evaluations for student
- `GET /api/contact-logs` - List all contact logs
- `POST /api/contact-logs` - Create new contact log
- `GET /api/incident-reports` - List all incident reports
- `POST /api/incident-reports` - Create new incident report
- `GET /api/settings` - Get application settings
- `PUT /api/settings/[id]` - Update settings

## Troubleshooting

1. **Database Connection Issues**: Check that all environment variables are set correctly
2. **Build Failures**: Ensure all dependencies are listed in package.json
3. **API Errors**: Check Vercel function logs in the dashboard

## Local Development

To run locally with the same configuration:

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5173`