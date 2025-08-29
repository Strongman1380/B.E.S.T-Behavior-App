// PostgreSQL Storage API - Uses PostgreSQL only
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
} from './storage';

// Note: Sample data initialization is now handled by the server
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
