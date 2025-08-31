import dotenv from 'dotenv';
import { ContactLog } from '../src/database/models/index.js';
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
        const criteria = {};
        if (req.query?.student_id) criteria.student_id = req.query.student_id;
        if (req.query?.start_date) criteria.contact_date_from = req.query.start_date;
        if (req.query?.end_date) criteria.contact_date_to = req.query.end_date;
        const logs = Object.keys(criteria).length > 0 ? await ContactLog.filter(criteria) : await ContactLog.list();
        res.json(logs);
        break;
      }

      case 'POST': {
        const newLog = await ContactLog.create(req.body);
        res.status(201).json(newLog);
        break;
      }

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Contact logs API error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Please check your database connection and environment variables'
    });
  }
}
