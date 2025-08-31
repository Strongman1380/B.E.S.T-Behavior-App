import dotenv from 'dotenv';
import { IncidentReport } from '../src/database/models/index.js';
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
        if (req.query?.incident_type) criteria.incident_type = req.query.incident_type;
        if (req.query?.start_date) criteria.incident_date_from = req.query.start_date;
        if (req.query?.end_date) criteria.incident_date_to = req.query.end_date;
        const reports = (Object.keys(criteria).length > 0)
          ? await IncidentReport.filter(criteria)
          : await IncidentReport.list();
        res.json(reports);
        break;
      }

      case 'POST': {
        const newReport = await IncidentReport.create(req.body);
        res.status(201).json(newReport);
        break;
      }
      case 'DELETE': {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        await IncidentReport.delete(id);
        res.status(204).end();
        break;
      }

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Incident reports API error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Please check your database connection and environment variables'
    });
  }
}
