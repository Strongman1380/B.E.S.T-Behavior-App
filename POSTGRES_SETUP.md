# PostgreSQL Setup for Bright Track

This guide shows how to configure PostgreSQL (Neon/Vercel Postgres) for your Bright Track application.

## Option 1: Neon (Recommended)

### 1. Create a Neon Database

1. Go to [Neon](https://neon.tech/) and sign up for a free account
2. Create a new project
3. Copy your connection string from the dashboard

### 2. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# PostgreSQL Configuration
DATABASE_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
POSTGRES_URL=postgresql://username:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# Environment
NODE_ENV=development
```

### 3. Initialize Database Schema

The app will automatically initialize the PostgreSQL schema when it starts. You can also manually run:

```bash
# Start the server (it will create tables automatically)
npm run server
```

### 4. Populate Sample Data

The app will automatically populate sample data when no students exist in the database.

## Option 2: Vercel Postgres

### 1. Add Postgres to Vercel Project

1. Go to your Vercel project dashboard
2. Go to Storage tab
3. Create a new Postgres database
4. Copy the connection string

### 2. Configure Environment Variables

In Vercel dashboard:
- Go to Settings → Environment Variables
- Add `DATABASE_URL` with your Postgres connection string
- Add `POSTGRES_URL` with the same connection string

For local development, create `.env`:

```bash
DATABASE_URL=your_vercel_postgres_connection_string
POSTGRES_URL=your_vercel_postgres_connection_string
NODE_ENV=development
```

### 3. Deploy and Initialize

Deploy your app to Vercel. The database schema will be initialized automatically on first run.

## Option 3: Local PostgreSQL

### 1. Install PostgreSQL

```bash
# macOS
brew install postgresql
brew services start postgresql

# Ubuntu/Debian
sudo apt-get install postgresql
sudo systemctl start postgresql
```

### 2. Create Database and User

```bash
# Connect to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE bright_track;
CREATE USER bright_track_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE bright_track TO bright_track_user;
\\q
```

### 3. Configure Environment Variables

```bash
DATABASE_URL=postgresql://bright_track_user:your_password@localhost:5432/bright_track
POSTGRES_URL=postgresql://bright_track_user:your_password@localhost:5432/bright_track
NODE_ENV=development
```

## Testing the Connection

To test your PostgreSQL connection:

```bash
# Start the backend server
npm run server

# You should see:
# ✅ PostgreSQL connection pool initialized successfully
# ✅ PostgreSQL schema initialized successfully
# 🚀 Bright Track server running on http://localhost:3001
```

If the app can't connect to PostgreSQL, it will automatically fall back to SQLite or localStorage.

## Database Schema

The app automatically creates these tables:

- `students` - Student information
- `daily_evaluations` - Behavior evaluations
- `contact_logs` - Communication logs
- `incident_reports` - Incident tracking
- `settings` - Application settings

## Migration from SQLite

If you're migrating from SQLite, the app uses a hybrid storage system that will:

1. Try PostgreSQL first
2. Fall back to SQLite if PostgreSQL unavailable
3. Fall back to Firebase if SQLite unavailable
4. Fall back to localStorage as final option

Your data will be preserved during the migration.

## Troubleshooting

### Connection Issues

1. Check your connection string format
2. Ensure your database server is running
3. Check firewall settings
4. Verify SSL requirements (Neon requires SSL)

### Environment Variables

1. Make sure `.env` file is in project root
2. Restart your server after changing env vars
3. Check for typos in variable names

### Logs

Check the server console for detailed error messages:

```bash
npm run server
# Look for PostgreSQL connection logs
```