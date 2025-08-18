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

// Initialize sample data on first load
initializeSampleData();

// Log which storage system is being used
getStorageType().then(type => {
  console.log(`Bright Track using ${type} for data storage`);
}).catch(error => {
  console.error('Storage initialization failed:', error);
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
