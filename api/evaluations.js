import dotenv from 'dotenv';
import { DailyEvaluation } from '../src/database/models/index.js';
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
        if (req.query?.date) criteria.date = req.query.date;
        if (req.query?.student_id) criteria.student_id = req.query.student_id;
        if (req.query?.start_date) criteria.date_from = req.query.start_date;
        if (req.query?.end_date) criteria.date_to = req.query.end_date;
        const evaluations = (Object.keys(criteria).length > 0)
          ? await DailyEvaluation.filter(criteria)
          : await DailyEvaluation.list();
        res.json(evaluations);
        break;
      }

      case 'POST': {
        const newEvaluation = await DailyEvaluation.create(req.body);
        res.status(201).json(newEvaluation);
        break;
      }
      case 'DELETE': {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        await DailyEvaluation.delete(id);
        res.status(204).end();
        break;
      }
      case 'PUT': {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const updated = await DailyEvaluation.update(id, req.body);
        res.json(updated);
        break;
      }

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
