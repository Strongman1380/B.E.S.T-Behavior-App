import express from 'express';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Import database models
import { Student, DailyEvaluation, ContactLog, IncidentReport, Settings } from './src/database/models/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dist directory
app.use(express.static(join(__dirname, 'dist')));

// API Routes

// Students
app.get('/api/students', async (req, res) => {
  try {
    const students = await Student.list();
    res.json(students);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/students/:id', async (req, res) => {
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

app.post('/api/students', async (req, res) => {
  try {
    const student = await Student.create(req.body);
    res.status(201).json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/students/:id', async (req, res) => {
  try {
    const student = await Student.update(req.params.id, req.body);
    res.json(student);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await Student.delete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Daily Evaluations
app.get('/api/evaluations', async (req, res) => {
  try {
    const evaluations = await DailyEvaluation.list();
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/evaluations/student/:studentId', async (req, res) => {
  try {
    const evaluations = await DailyEvaluation.getByStudent(req.params.studentId);
    res.json(evaluations);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/evaluations', async (req, res) => {
  try {
    const evaluation = await DailyEvaluation.create(req.body);
    res.status(201).json(evaluation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Contact Logs
app.get('/api/contact-logs', async (req, res) => {
  try {
    const logs = await ContactLog.list();
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contact-logs', async (req, res) => {
  try {
    const log = await ContactLog.create(req.body);
    res.status(201).json(log);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Incident Reports
app.get('/api/incident-reports', async (req, res) => {
  try {
    const reports = await IncidentReport.list();
    res.json(reports);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/incident-reports', async (req, res) => {
  try {
    const report = await IncidentReport.create(req.body);
    res.status(201).json(report);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Settings.list();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/settings/:id', async (req, res) => {
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

app.listen(PORT, () => {
  console.log(`🚀 Bright Track server running on http://localhost:${PORT}`);
  console.log(`📊 Using SQLite database for data storage`);
});
