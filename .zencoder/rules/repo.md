---
description: Repository Information Overview
alwaysApply: true
---

# Bright Track Information

## Summary
Bright Track is a standalone student behavior tracking application built with React and Vite. It allows educators to track student behavior, create daily evaluations, generate reports, and visualize progress. The app requires PostgreSQL database storage and runs without authentication - providing direct access to all features.

## Structure
- **src/**: Main source code directory containing React components, contexts, and utilities
  - **api/**: PostgreSQL storage API and database clients
  - **components/**: UI components organized by feature (behavior, contacts, etc.)
  - **database/**: PostgreSQL database schema and model definitions
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
- PostgreSQL (pg 8.16.3) for database storage
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

# Set up PostgreSQL database connection in .env file
# Copy .env.example to .env and configure DATABASE_URL

# Development server
npm run dev

# Production build
npm run build
```

## Database
**Type**: PostgreSQL (required)
**Schema**: SQL schema defined in src/database/postgres-schema.sql
**Tables**: students, daily_evaluations, contact_logs, incident_reports, settings
**Connection**: Managed through src/api/postgresClient.js

## Storage Options
**Primary Storage**: PostgreSQL database (required)
**Configuration**: Environment variables for database connection
**API**: Simplified storage API in src/api/storage.js

## Authentication
**Status**: No authentication required - application runs without login
**Access**: Direct access to all features without user accounts

## Testing
**targetFramework**: Playwright