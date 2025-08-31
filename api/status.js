import dotenv from 'dotenv';
import { initializeDatabase, executeQuery } from '../src/database/postgres.js';
import { applyCors } from './_cors.js';

// Load environment variables
dotenv.config();

let databaseReady = false;
let databaseError = null;

async function checkDatabase() {
  try {
    await initializeDatabase();
    // Perform a simple query to verify connectivity
    await executeQuery('SELECT 1');
    databaseReady = true;
    return true;
  } catch (error) {
    databaseError = error.message;
    return false;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  const allowed = applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(allowed ? 200 : 403).end();
    return;
  }

  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check database status
  if (!databaseReady && !databaseError) {
    await checkDatabase();
  }

  res.json({
    database: {
      ready: databaseReady,
      error: databaseError,
      type: 'PostgreSQL'
    },
    server: {
      status: 'running',
      environment: process.env.NODE_ENV || 'production'
    }
  });
}
