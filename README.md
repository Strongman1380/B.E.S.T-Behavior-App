# Bright Track - Student Behavior Tracking

A standalone student behavior tracking application built with React and Vite. Allows educators to track student behavior, create daily evaluations, generate reports, and visualize progress using PostgreSQL database storage.

## Features

- **Student Management**: Add and manage student profiles
- **Daily Evaluations**: Track behavior scores across multiple periods
- **Behavior Summaries**: Generate comprehensive behavior reports
- **Incident Reports**: Document and track behavioral incidents
- **Contact Logs**: Record parent/guardian communications
- **KPI Dashboard**: Visualize behavior trends and statistics
- **Settings Management**: Configure teacher and school information

## Prerequisites

- **Node.js** (v18 or higher)
- **PostgreSQL Database** (required)
  - Local PostgreSQL installation, or
  - Cloud PostgreSQL service (Neon, Vercel Postgres, AWS RDS, etc.)

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bright-track-3233ad6b
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure PostgreSQL Database**
   
   Copy the environment template:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your PostgreSQL connection details:
   ```env
   DATABASE_URL=postgresql://username:password@hostname:5432/database_name
   POSTGRES_URL=postgresql://username:password@hostname:5432/database_name
   ```

4. **Set up the database schema**
   
   Run the SQL schema file in your PostgreSQL database:
   ```bash
   psql -d your_database_name -f src/database/postgres-schema.sql
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Setup Options

### Option 1: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a database: `createdb bright_track`
3. Use connection string: `postgresql://username:password@localhost:5432/bright_track`

### Option 2: Neon (Recommended for cloud)
1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy the connection string from the dashboard
4. Use the connection string in your `.env` file

### Option 3: Vercel Postgres
1. Create a Vercel project
2. Add Postgres storage in Vercel dashboard
3. Copy the connection string from Vercel
4. Use the connection string in your `.env` file

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run server` - Start Express server (if needed)
- `npm run dev:full` - Start both Express server and Vite dev server

## Architecture

- **Frontend**: React 18 with Vite
- **Routing**: React Router 7
- **Styling**: TailwindCSS with Radix UI components
- **Database**: PostgreSQL only (SQLite and localStorage removed)
- **Storage API**: Simplified PostgreSQL-only storage in `src/api/storage.js`
- **Authentication**: None required - direct access to all features

## Project Structure

```
src/
├── api/                 # Database API and storage layer
│   ├── storage.js       # PostgreSQL-only storage API
│   ├── postgresClient.js # PostgreSQL client and models
│   └── entities.js      # Entity exports
├── components/          # React components
│   ├── ui/             # Reusable UI components
│   ├── auth/           # Authentication components (removed)
│   ├── behavior/       # Behavior tracking components
│   ├── contacts/       # Contact management components
│   └── sync/           # Storage status components
├── database/           # Database schema and models
│   ├── postgres-schema.sql # PostgreSQL schema
│   └── models/         # PostgreSQL model definitions
├── pages/              # Page components
└── utils/              # Utility functions
```

## Environment Variables

Required environment variables in `.env`:

```env
# PostgreSQL Database (Required)
DATABASE_URL=postgresql://username:password@hostname:5432/database_name
POSTGRES_URL=postgresql://username:password@hostname:5432/database_name

# Environment
NODE_ENV=development
```

## Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your hosting service

3. **Ensure PostgreSQL database is accessible** from your hosting environment

4. **Set environment variables** in your hosting service with your production PostgreSQL connection string

## Troubleshooting

### Database Connection Issues
- Verify your PostgreSQL server is running
- Check connection string format and credentials
- Ensure database exists and schema is applied
- Check firewall settings for remote connections

### Build Issues
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (requires v18+)
- Clear node_modules and reinstall if needed

## License

This project is private and proprietary.