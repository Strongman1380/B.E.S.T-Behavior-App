---
description: Repository Information Overview
alwaysApply: true
---

# Bright Track Information

## Summary
Bright Track is a standalone student behavior tracking application built with React and Vite. It allows educators to track student behavior, create daily evaluations, generate reports, and visualize progress. The app can run completely independently using local browser storage, with optional Firebase integration for authentication and cloud storage.

## Structure
- **src/**: Main source code directory containing React components, contexts, and utilities
  - **api/**: API clients for Firebase and local storage
  - **components/**: UI components organized by feature (auth, behavior, contacts, etc.)
  - **contexts/**: React context providers (AuthContext)
  - **database/**: SQLite database configuration, schema, and connection utilities
  - **pages/**: React components for different application pages/routes
  - **utils/**: Utility functions and helpers
- **public/**: Static assets and manifest file
- **dist/**: Build output directory

## Language & Runtime
**Language**: JavaScript/JSX with some TypeScript
**Version**: ES Modules (type: "module")
**Build System**: Vite
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- React 18.2.0 with React Router 7.2.0
- Firebase 12.1.0 for authentication and cloud storage
- Better-SQLite3 12.2.0 for local database
- Radix UI components for accessible UI elements
- TailwindCSS for styling
- Recharts 2.15.4 for data visualization
- Zod 3.24.2 for schema validation

**Development Dependencies**:
- Vite 6.1.0 as the build tool
- ESLint 9.19.0 for code linting
- TailwindCSS 3.4.17 and PostCSS 8.5.3 for styling
- TypeScript types for React and Node

## Build & Installation
```bash
# Install dependencies
npm install

# Development server
npm run dev

# Production build
npm run build

# Firebase setup (optional)
npm run setup-firebase
```

## Database
**Type**: SQLite (better-sqlite3)
**Schema**: SQL schema defined in src/database/schema.sql
**Tables**: students, daily_evaluations, contact_logs, incident_reports, settings
**Connection**: Managed through src/database/connection.js

## Storage Options
**Local Storage**: Browser localStorage for offline usage
**Cloud Storage**: Optional Firebase Firestore integration
**Hybrid Storage**: Configurable through src/api/hybridStorage.js

## Authentication
**Provider**: Firebase Authentication
**Methods**: Google sign-in and phone authentication
**Configuration**: Environment variables in .env file

## Testing
**targetFramework**: Playwright