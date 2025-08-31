import dotenv from 'dotenv';
import { Student } from '../../src/database/models/index.js';

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

  const { id } = req.query;

  try {
    switch (req.method) {
      case 'GET':
        const student = await Student.get(id);
        if (!student) {
          return res.status(404).json({ error: 'Student not found' });
        }
        res.json(student);
        break;

      case 'PUT':
        const updatedStudent = await Student.update(id, req.body);
        res.json(updatedStudent);
        break;

      case 'DELETE':
        await Student.delete(id);
        res.status(204).end();
        break;

      default:
        res.status(405).json({ error: 'Method not allowed' });
    }
  } catch (error) {
    console.error('Student API error:', error);
    res.status(500).json({ 
      error: error.message,
      suggestion: 'Please check your database connection and environment variables'
    });
  }
}