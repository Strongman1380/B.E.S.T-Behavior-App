import dotenv from 'dotenv';
import { initializeDatabase, initializeSchema } from '../src/database/postgres.js';
import { initializeSampleData } from '../src/api/entities.js';

// Load environment variables
dotenv.config();

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('🔄 Initializing PostgreSQL database...');
    await initializeDatabase();
    
    console.log('🔄 Initializing database schema...');
    await initializeSchema();
    
    console.log('🔄 Checking for sample data...');
    await initializeSampleData();
    
    res.json({
      success: true,
      message: 'Database initialized successfully',
      database: {
        type: 'PostgreSQL',
        status: 'ready'
      }
    });
  } catch (error) {
    console.error('Database initialization failed:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Please check your DATABASE_URL environment variable and ensure PostgreSQL is accessible'
    });
  }
}