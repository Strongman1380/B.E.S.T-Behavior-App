import dotenv from 'dotenv';
import { Student } from '../src/database/models/index.js';
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
        if (req.query?.active !== undefined) {
          const v = req.query.active;
          criteria.active = v === 'true' || v === true || v === '1' ? true : false;
        }
        const students = (Object.keys(criteria).length > 0)
          ? await Student.filter(criteria)
          : await Student.list();
        res.json(students);
        break;
      }

      case 'POST': {
        const newStudent = await Student.create(req.body);
        res.status(201).json(newStudent);
        break;
      }

      case 'PUT': {
        const { id } = req.query;
        if (!id) return res.status(400).json({ error: 'Missing id' });
        const updated = await Student.update(id, req.body);
        res.json(updated);
        break;
      }

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Students API error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Please check your database connection and environment variables'
    });
  }
}
