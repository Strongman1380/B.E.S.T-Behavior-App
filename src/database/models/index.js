// Export all database models
export { Student } from './Student.js';
export { DailyEvaluation } from './DailyEvaluation.js';
export { ContactLog } from './ContactLog.js';
export { IncidentReport } from './IncidentReport.js';
export { Settings } from './Settings.js';

// Re-export database connection utilities
export { getDatabase, executeQuery, executeTransaction, closeDatabase } from '../connection.js';