import dotenv from 'dotenv';
import { Settings } from '../src/database/models/index.js';
import { applyCors } from './_cors.js';

// Load environment variables
dotenv.config();

export default async function handler(req, res) {
  // Enable CORS
  const allowed = applyCors(req, res);

  if (req.method === 'OPTIONS') {
    res.status(allowed ? 200 : 403).end();
    return;
  }

  try {
    switch (req.method) {
      case 'GET': {
        const settings = await Settings.list();
        res.json(settings);
        break;
      }

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Settings API error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Please check your database connection and environment variables'
    });
  }
}
