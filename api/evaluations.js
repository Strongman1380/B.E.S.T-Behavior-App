import dotenv from 'dotenv';
import { DailyEvaluation } from '../src/database/models/index.js';

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

  try {
    switch (req.method) {
      case 'GET':
        const evaluations = await DailyEvaluation.list();
        res.json(evaluations);
        break;

      case 'POST':
        const newEvaluation = await DailyEvaluation.create(req.body);
        res.status(201).json(newEvaluation);
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Evaluations API error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Please check your database connection and environment variables'
    });
  }
}