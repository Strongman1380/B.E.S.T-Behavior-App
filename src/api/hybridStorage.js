import { 
  FirebaseStudent, 
  FirebaseDailyEvaluation, 
  FirebaseSettings, 
  FirebaseContactLog, 
  FirebaseBehaviorSummary, 
  FirebaseIncidentReport, 
  FirebaseUser,
  isFirebaseAvailable 
} from './firebase';

import { 
  Student as LocalStudent, 
  DailyEvaluation as LocalDailyEvaluation, 
  Settings as LocalSettings, 
  ContactLog as LocalContactLog, 
  BehaviorSummary as LocalBehaviorSummary,
  IncidentReport as LocalIncidentReport,
  User as LocalUser
} from './localStorage';

import { 
  Student as SQLiteStudent, 
  DailyEvaluation as SQLiteDailyEvaluation, 
  Settings as SQLiteSettings, 
  ContactLog as SQLiteContactLog, 
  BehaviorSummary as SQLiteBehaviorSummary,
  IncidentReport as SQLiteIncidentReport,
  User as SQLiteUser,
  isSQLiteAvailable
} from './sqliteClient';

import { 
  Student as PostgresStudent, 
  DailyEvaluation as PostgresDailyEvaluation, 
  Settings as PostgresSettings, 
  ContactLog as PostgresContactLog, 
  BehaviorSummary as PostgresBehaviorSummary,
  IncidentReport as PostgresIncidentReport,
  User as PostgresUser,
  isPostgresAvailable
} from './postgresClient';

// Hybrid storage class that uses PostgreSQL > SQLite > Firebase > localStorage in priority order
class HybridEntity {
  constructor(firebaseEntity, localEntity, sqliteEntity, postgresEntity, entityName) {
    this.firebaseEntity = firebaseEntity;
    this.localEntity = localEntity;
    this.sqliteEntity = sqliteEntity;
    this.postgresEntity = postgresEntity;
    this.entityName = entityName;
    this.listeners = new Set();
    
    // Initialize storage type detection
    this.initializeStorage();
  }

  async initializeStorage() {
    // Check storage availability in priority order: PostgreSQL > SQLite > Firebase > localStorage
    this.usePostgres = await isPostgresAvailable();
    this.useSQLite = !this.usePostgres && await isSQLiteAvailable();
    this.useFirebase = !this.usePostgres && !this.useSQLite && isFirebaseAvailable();
    
    const storageType = this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : this.useFirebase ? 'Firebase' : 'localStorage';
    console.log(`${this.entityName} using: ${storageType}`);
    
    // If Firebase is available, sync local data to cloud on first load
    if (this.useFirebase) {
      this.syncLocalToCloud();
    }
  }

  // Get the appropriate storage entity
  getStorageEntity() {
    if (this.usePostgres) return this.postgresEntity;
    if (this.useSQLite) return this.sqliteEntity;
    if (this.useFirebase) return this.firebaseEntity;
    return this.localEntity;
  }

  // Sync existing localStorage data to Firebase (one-time migration)
  async syncLocalToCloud() {
    try {
      const localData = this.localEntity.list();
      if (localData.length > 0) {
        console.log(`Syncing ${localData.length} ${this.entityName} records to cloud...`);
        
        // Check if cloud already has data
        const cloudData = await this.firebaseEntity.list();
        if (cloudData.length === 0) {
          // Only sync if cloud is empty
          await Promise.all(localData.map(item => this.firebaseEntity.create(item)));
          console.log(`Successfully synced ${this.entityName} to cloud`);
        }
      }
    } catch (error) {
      console.warn(`Failed to sync ${this.entityName} to cloud:`, error);
    }
  }

  // Create a new record
  async create(data) {
    const storage = this.getStorageEntity();
    try {
      const result = await storage.create(data);
      // Cache in localStorage if using PostgreSQL, SQLite or Firebase
      if (this.usePostgres || this.useSQLite || this.useFirebase) {
        this.localEntity.save(result);
      }
      return result;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} create failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.save(data);
    }
  }

  // Get a record by ID
  async get(id) {
    const storage = this.getStorageEntity();
    try {
      const result = await storage.get(id);
      // Cache in localStorage if using SQLite or Firebase
      if (result && (this.useSQLite || this.useFirebase)) {
        this.localEntity.save(result);
      }
      return result;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} get failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.get(id);
    }
  }

  // List all records
  async list(orderBy) {
    const storage = this.getStorageEntity();
    try {
      const result = await storage.list(orderBy);
      // Cache in localStorage if using PostgreSQL, SQLite or Firebase
      if (this.usePostgres || this.useSQLite || this.useFirebase) {
        this.localEntity.saveAll(result);
      }
      return result;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} list failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.list(orderBy);
    }
  }

  // Filter records
  async filter(filters) {
    const storage = this.getStorageEntity();
    try {
      return await storage.filter(filters);
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} filter failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.filter(filters);
    }
  }

  // Update a record
  async update(id, data) {
    const storage = this.getStorageEntity();
    try {
      const result = await storage.update(id, data);
      // Cache in localStorage if using PostgreSQL, SQLite or Firebase
      if (this.usePostgres || this.useSQLite || this.useFirebase) {
        this.localEntity.save(result);
      }
      return result;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} update failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.save({ id, ...data });
    }
  }

  // Delete a record
  async delete(id) {
    const storage = this.getStorageEntity();
    try {
      await storage.delete(id);
      // Also delete from localStorage if using PostgreSQL, SQLite or Firebase
      if (this.usePostgres || this.useSQLite || this.useFirebase) {
        this.localEntity.delete(id);
      }
      return true;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} delete failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.delete(id);
    }
  }

  // Save (create or update)
  async save(data) {
    const storage = this.getStorageEntity();
    try {
      const result = await storage.save(data);
      // Cache in localStorage if using PostgreSQL, SQLite or Firebase
      if (this.usePostgres || this.useSQLite || this.useFirebase) {
        this.localEntity.save(result);
      }
      return result;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} save failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.save(data);
    }
  }

  // Save multiple records
  async saveAll(dataArray) {
    const storage = this.getStorageEntity();
    try {
      const result = await storage.saveAll(dataArray);
      // Cache in localStorage if using PostgreSQL, SQLite or Firebase
      if (this.usePostgres || this.useSQLite || this.useFirebase) {
        this.localEntity.saveAll(result);
      }
      return result;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} saveAll failed for ${this.entityName}, using localStorage:`, error);
      return this.localEntity.saveAll(dataArray);
    }
  }

  // Real-time listener for changes
  onSnapshot(callback, filters = {}) {
    if (this.useFirebase) {
      const unsubscribe = this.firebaseEntity.onSnapshot((data) => {
        // Cache data locally
        this.localEntity.saveAll(data);
        callback(data);
      }, filters);
      
      this.listeners.add(unsubscribe);
      return unsubscribe;
    } else {
      // For localStorage, we can't provide real-time updates
      // But we can return the current data immediately
      setTimeout(() => {
        const data = this.localEntity.list();
        callback(data);
      }, 0);
      
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Real-time listener for a specific document
  onDocSnapshot(id, callback) {
    if (this.useFirebase) {
      const unsubscribe = this.firebaseEntity.onDocSnapshot(id, (data) => {
        if (data) {
          // Cache data locally
          this.localEntity.save(data);
        }
        callback(data);
      });
      
      this.listeners.add(unsubscribe);
      return unsubscribe;
    } else {
      // For localStorage, return current data
      setTimeout(() => {
        const data = this.localEntity.get(id);
        callback(data);
      }, 0);
      
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // Check if using Firebase
  isUsingFirebase() {
    return this.useFirebase;
  }

  // Clear all data for this entity
  async clearAll() {
    const storage = this.getStorageEntity();
    try {
      // Get all records first
      const allRecords = await storage.list();
      
      // Delete each record
      await Promise.all(allRecords.map(record => storage.delete(record.id)));
      
      // Also clear from localStorage if using PostgreSQL, SQLite or Firebase
      if (this.usePostgres || this.useSQLite || this.useFirebase) {
        const localRecords = this.localEntity.list();
        localRecords.forEach(record => this.localEntity.delete(record.id));
      }
      
      return true;
    } catch (error) {
      console.warn(`${this.usePostgres ? 'PostgreSQL' : this.useSQLite ? 'SQLite' : 'Firebase'} clearAll failed for ${this.entityName}, using localStorage:`, error);
      // Fallback to clearing localStorage
      const localRecords = this.localEntity.list();
      localRecords.forEach(record => this.localEntity.delete(record.id));
      return true;
    }
  }
}

// Create hybrid entities
export const Student = new HybridEntity(FirebaseStudent, LocalStudent, SQLiteStudent, PostgresStudent, 'students');
export const DailyEvaluation = new HybridEntity(FirebaseDailyEvaluation, LocalDailyEvaluation, SQLiteDailyEvaluation, PostgresDailyEvaluation, 'daily_evaluations');
export const Settings = new HybridEntity(FirebaseSettings, LocalSettings, SQLiteSettings, PostgresSettings, 'settings');
export const ContactLog = new HybridEntity(FirebaseContactLog, LocalContactLog, SQLiteContactLog, PostgresContactLog, 'contact_logs');
export const BehaviorSummary = new HybridEntity(FirebaseBehaviorSummary, LocalBehaviorSummary, SQLiteBehaviorSummary, PostgresBehaviorSummary, 'behavior_summaries');
export const IncidentReport = new HybridEntity(FirebaseIncidentReport, LocalIncidentReport, SQLiteIncidentReport, PostgresIncidentReport, 'incident_reports');
export const User = new HybridEntity(FirebaseUser, LocalUser, SQLiteUser, PostgresUser, 'users');

// Utility function to check storage type
export const getStorageType = async () => {
  const postgresAvailable = await isPostgresAvailable();
  if (postgresAvailable) return 'postgresql';
  const sqliteAvailable = await isSQLiteAvailable();
  if (sqliteAvailable) return 'sqlite';
  return isFirebaseAvailable() ? 'firebase' : 'localStorage';
};

// Initialize sample data if needed
export const initializeSampleData = async () => {
  try {
    const storageType = await getStorageType();
    
    // Check if we already have data
    const students = await Student.list();
    if (students.length === 0) {
      if (storageType === 'postgresql') {
        // For PostgreSQL, we can populate sample data directly
        console.log('PostgreSQL is empty. Populating with sample data...');
        await populatePostgresSampleData();
      } else if (storageType === 'sqlite') {
        // For SQLite, the setup-sqlite script handles sample data
        console.log('SQLite is empty. Run `npm run setup-sqlite` to populate with data.');
      } else {
        // For localStorage and Firebase, use the local sample data
        const { initializeSampleData: initLocal } = await import('./localStorage');
        initLocal();
        
        // If using Firebase, the hybrid system will sync the data
        if (isFirebaseAvailable()) {
          console.log('Sample data will be synced to Firebase automatically');
        }
      }
    }
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
  }
};

// Populate PostgreSQL with sample data
async function populatePostgresSampleData() {
  const sampleStudents = [
    { student_name: 'Chance', grade_level: '3rd Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Elijah', grade_level: '4th Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Eloy', grade_level: '2nd Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Emiliano (Nano)', grade_level: '5th Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Curtis', grade_level: '1st Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Jason', grade_level: '3rd Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Paytin', grade_level: '2nd Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Jaden', grade_level: '4th Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'David', grade_level: '5th Grade', teacher_name: 'Ms. Johnson' },
    { student_name: 'Theodore (TJ)', grade_level: '1st Grade', teacher_name: 'Ms. Johnson' }
  ];

  try {
    for (const studentData of sampleStudents) {
      await Student.create(studentData);
    }
    console.log(`✅ Successfully populated PostgreSQL with ${sampleStudents.length} students`);
  } catch (error) {
    console.error('Failed to populate PostgreSQL sample data:', error);
  }
}
