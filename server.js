import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
dotenv.config();

// Import database initialization
import { initializeDatabase, initializeSchema } from './src/database/postgres.js';

// Import database models
import { Student, DailyEvaluation, ContactLog, IncidentReport, Settings } from './src/database/models/index.js';

// Import sample data initialization
import { initializeSampleData } from './src/api/entities.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Database initialization
let databaseReady = false;
let databaseError = null;

async function initializeApp() {
  try {
    console.log('🔄 Initializing PostgreSQL database...');
    await initializeDatabase();
    await initializeSchema();
    
    // Initialize sample data if database is empty
    console.log('🔄 Checking for sample data...');
    await initializeSampleData();
    
    databaseReady = true;
    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    databaseError = error.message;
    // Continue without database - app will show error message
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(join(__dirname, 'dist')));

// API Routes

// Database status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    database: {
      ready: databaseReady,
      error: databaseError,
      type: 'PostgreSQL'
    },
    server: {
      status: 'running',
      port: PORT,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Middleware to check database status for data endpoints
const requireDatabase = (req, res, next) => {
  if (!databaseReady) {
    return res.status(503).json({ 
      error: 'Database not available', 
      details: databaseError || 'Database initialization failed',
      suggestion: 'Please check your DATABASE_URL environment variable and ensure PostgreSQL is accessible'
    });
  }
  next();
};

// Students
app.get('/api/students', requireDatabase, async (req, res) => {
  try {
    let students;
    const criteria = {};
    if (req.query?.active !== undefined) {
      const v = req.query.active;
      criteria.active = v === 'true' || v === true || v === '1' ? true : false;
    }
    students = Object.keys(criteria).length > 0 ? await Student.filter(criteria) : await Student.list();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/:id', requireDatabase, async (req, res) => {
  try {
    const student = await Student.get(req.params.id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/students', requireDatabase, async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/students/:id', requireDatabase, async (req, res) => {
  try {
    const student = await Student.update(req.params.id, req.body);
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/students/:id', requireDatabase, async (req, res) => {
  try {
    await Student.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Evaluations
app.get('/api/evaluations', requireDatabase, async (req, res) => {
  try {
    const criteria = {};
    if (req.query?.date) criteria.date = req.query.date;
    if (req.query?.student_id) criteria.student_id = req.query.student_id;
    if (req.query?.start_date) criteria.date_from = req.query.start_date;
    if (req.query?.end_date) criteria.date_to = req.query.end_date;
    const evaluations = Object.keys(criteria).length > 0 ? await DailyEvaluation.filter(criteria) : await DailyEvaluation.list();
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/evaluations/student/:studentId', requireDatabase, async (req, res) => {
  try {
    const evaluations = await DailyEvaluation.getByStudent(req.params.studentId);
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/evaluations', requireDatabase, async (req, res) => {
  try {
    const evaluation = await DailyEvaluation.create(req.body);
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/evaluations/:id', requireDatabase, async (req, res) => {
  try {
    const evaluation = await DailyEvaluation.update(req.params.id, req.body);
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/evaluations/:id', requireDatabase, async (req, res) => {
  try {
    await DailyEvaluation.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallbacks for query param id usage
app.put('/api/evaluations', requireDatabase, async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const evaluation = await DailyEvaluation.update(id, req.body);
    res.json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/evaluations', requireDatabase, async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await DailyEvaluation.delete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contact Logs
app.get('/api/contact-logs', requireDatabase, async (req, res) => {
  try {
    const criteria = {};
    if (req.query?.student_id) criteria.student_id = req.query.student_id;
    if (req.query?.start_date) criteria.contact_date_from = req.query.start_date;
    if (req.query?.end_date) criteria.contact_date_to = req.query.end_date;
    const logs = Object.keys(criteria).length > 0 ? await ContactLog.filter(criteria) : await ContactLog.list();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contact-logs', requireDatabase, async (req, res) => {
  try {
    const log = await ContactLog.create(req.body);
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Incident Reports
app.get('/api/incident-reports', requireDatabase, async (req, res) => {
  try {
    const criteria = {};
    if (req.query?.student_id) criteria.student_id = req.query.student_id;
    if (req.query?.incident_type) criteria.incident_type = req.query.incident_type;
    if (req.query?.start_date) criteria.incident_date_from = req.query.start_date;
    if (req.query?.end_date) criteria.incident_date_to = req.query.end_date;
    const reports = Object.keys(criteria).length > 0 ? await IncidentReport.filter(criteria) : await IncidentReport.list();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incident-reports', requireDatabase, async (req, res) => {
  try {
    const report = await IncidentReport.create(req.body);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/incident-reports/:id', requireDatabase, async (req, res) => {
  try {
    await IncidentReport.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/incident-reports', requireDatabase, async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await IncidentReport.delete(id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings
app.get('/api/settings', requireDatabase, async (req, res) => {
  try {
    const settings = await Settings.list();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings/:id', requireDatabase, async (req, res) => {
  try {
    const settings = await Settings.update(req.params.id, req.body);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Behavior Summaries (placeholder endpoint)
app.get('/api/behavior-summaries', async (req, res) => {
  try {
    // Return empty array for now since this feature might not be fully implemented
    res.json([]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/behavior-summaries', async (req, res) => {
  try {
    // Return empty object for now
    res.status(201).json({});
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Catch all handler: send back React's index.html file for client-side routing
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Initialize database and start server
async function startServer() {
  await initializeApp();
  
  app.listen(PORT, () => {
    console.log(`🚀 Bright Track server running on http://localhost:${PORT}`);
    if (databaseReady) {
      console.log(`✅ PostgreSQL database connected and ready`);
    } else {
      console.log(`❌ PostgreSQL database not available: ${databaseError}`);
      console.log(`💡 Please check your DATABASE_URL environment variable`);
    }
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});
