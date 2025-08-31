import dotenv from 'dotenv';
import { initializeDatabase, initializeSchema } from '../src/database/postgres.js';

// Load environment variables
dotenv.config();

let databaseReady = false;
let databaseError = null;

async function checkDatabase() {
  try {
    await initializeDatabase();
    databaseReady = true;
    return true;
  } catch (error) {
    databaseError = error.message;
    return false;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
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