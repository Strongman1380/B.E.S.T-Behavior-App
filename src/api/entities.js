// Hybrid Storage API - Uses Firebase for multi-user sync, localStorage as fallback
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
} from './hybridStorage';

// Initialize sample data on first load
initializeSampleData();

// Log which storage system is being used
getStorageType().then(type => {
  console.log(`Bright Track using ${type} for data storage`);
});

export {
  Student,
  DailyEvaluation,
  Settings,
  ContactLog,
  BehaviorSummary,
  IncidentReport,
  User,
  getStorageType
};
