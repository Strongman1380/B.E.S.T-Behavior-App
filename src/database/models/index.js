// Database Models Index
// Exports all PostgreSQL models for use throughout the application

import { PostgresStudent } from './PostgresStudent.js';
import { PostgresDailyEvaluation } from './PostgresDailyEvaluation.js';
import { 
  PostgresContactLog, 
  PostgresIncidentReport, 
  PostgresSettings,
  PostgresBehaviorSummary,
  PostgresUser
} from './PostgresModels.js';

// Export models with consistent naming
export const Student = PostgresStudent;
export const DailyEvaluation = PostgresDailyEvaluation;
export const ContactLog = PostgresContactLog;
export const IncidentReport = PostgresIncidentReport;
export const Settings = PostgresSettings;
export const BehaviorSummary = PostgresBehaviorSummary;
export const User = PostgresUser;

// Export all models as default for convenience
export default {
  Student,
  DailyEvaluation,
  ContactLog,
  IncidentReport,
  Settings,
  BehaviorSummary,
  User
};