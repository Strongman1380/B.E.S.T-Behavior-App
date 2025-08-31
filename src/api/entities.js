// Supabase Storage API - Uses Supabase PostgreSQL via API
import { 
  Student,
  DailyEvaluation,
  Settings,
  ContactLog,
  BehaviorSummary,
  IncidentReport,
  User,
  getStorageType,
  initializeSampleData
} from './storage.js';

// Note: Sample data initialization is now handled by Supabase
// and only occurs when the database is properly configured

export {
  Student,
  DailyEvaluation,
  Settings,
  ContactLog,
  BehaviorSummary,
  IncidentReport,
  User,
  getStorageType,
  initializeSampleData
};
