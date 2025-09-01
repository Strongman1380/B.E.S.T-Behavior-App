# Bright Track - Student Behavior Tracking

A standalone student behavior tracking application built with React and Vite. Allows educators to track student behavior, create daily evaluations, generate reports, and visualize progress using Supabase (PostgreSQL) as the only database.

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
- **Supabase Project** (required)
  - Create a project at https://supabase.com
  - Use the project URL and anon public key in the frontend

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

3. **Configure Supabase**
   
   Create `.env.local` and add:
   ```env
   VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
   ```

4. **Set up the database schema**
   
   In the Supabase SQL Editor, paste and run `supabase-schema.sql` (root).

5. **Start the development server**
   ```bash
   npm run dev
   ```

## Database Setup

This project is Supabase-only and does not require any Node/Express server.

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
 

## Architecture

- **Frontend**: React 18 with Vite
- **Routing**: React Router 7
- **Styling**: TailwindCSS with Radix UI components
- **Database**: Supabase (PostgreSQL)
- **Storage API**: Supabase-only storage in `src/api/supabaseStorage.js`
- **Authentication**: None required - direct access to all features

## Project Structure

```
src/
├── api/
│   ├── supabaseStorage.js  # Supabase storage adapter
│   └── entities.js         # Entity exports
├── components/
├── pages/
├── config/
└── utils/
```

## Environment Variables

Required environment variables in `.env.local` (dev) or CI build-time env:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_PUBLIC_ANON_KEY
```

## Deployment

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Deploy the `dist` folder** to your static hosting (e.g., GitHub Pages)

3. **Provide Supabase env at build time** (e.g., GitHub Actions secrets `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`)

## Troubleshooting

### Supabase Connection Issues
- Ensure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are set
- Run `supabase-schema.sql` in the Supabase SQL Editor
- Verify RLS policies allow anon role to read/write as intended

### Build Issues
- Run `npm install` to ensure all dependencies are installed
- Check Node.js version (requires v18+)
- Clear node_modules and reinstall if needed

## License

This project is private and proprietary.
