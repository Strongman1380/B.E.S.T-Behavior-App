// PostgreSQL-only storage - simplified from hybrid storage
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

// PostgreSQL storage class
class PostgreSQLEntity {
  constructor(postgresEntity, entityName) {
    this.postgresEntity = postgresEntity;
    this.entityName = entityName;
    this.listeners = new Set();
    this.isAvailable = null; // Will be checked when needed
    this.initializationPromise = null;
  }

  async initializeStorage() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        // Check PostgreSQL availability
        this.isAvailable = await isPostgresAvailable();
        
        if (!this.isAvailable) {
          throw new Error(`PostgreSQL is not available for ${this.entityName}. Please configure your database connection.`);
        }
        
        console.log(`${this.entityName} using: PostgreSQL`);
        return true;
      } catch (error) {
        this.isAvailable = false;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  async ensureInitialized() {
    if (this.isAvailable === null) {
      await this.initializeStorage();
    }
    if (!this.isAvailable) {
      throw new Error(`PostgreSQL is not available for ${this.entityName}. Please configure your database connection.`);
    }
  }

  // Get the storage entity (always PostgreSQL)
  getStorageEntity() {
    return this.postgresEntity;
  }

  // Create a new record
  async create(data) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      return await storage.create(data);
    } catch (error) {
      console.error(`PostgreSQL create failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // Get a record by ID
  async get(id) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      return await storage.get(id);
    } catch (error) {
      console.error(`PostgreSQL get failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // List all records
  async list(orderBy) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      return await storage.list(orderBy);
    } catch (error) {
      console.error(`PostgreSQL list failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // Filter records
  async filter(filters) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      return await storage.filter(filters);
    } catch (error) {
      console.error(`PostgreSQL filter failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // Update a record
  async update(id, data) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      return await storage.update(id, data);
    } catch (error) {
      console.error(`PostgreSQL update failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // Delete a record
  async delete(id) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      await storage.delete(id);
      return true;
    } catch (error) {
      console.error(`PostgreSQL delete failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // Save (create or update)
  async save(data) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      return await storage.save(data);
    } catch (error) {
      console.error(`PostgreSQL save failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // Save multiple records
  async saveAll(dataArray) {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      return await storage.saveAll(dataArray);
    } catch (error) {
      console.error(`PostgreSQL saveAll failed for ${this.entityName}:`, error);
      throw error;
    }
  }

  // Real-time listener for changes (simplified without real-time updates)
  onSnapshot(callback, filters = {}) {
    // For PostgreSQL, we can't provide real-time updates
    // But we can return the current data immediately
    setTimeout(async () => {
      try {
        await this.ensureInitialized();
        const data = await this.list();
        callback(data);
      } catch (error) {
        console.error(`Failed to load data for ${this.entityName}:`, error);
        callback([]);
      }
    }, 0);
    
    return () => {}; // Return empty unsubscribe function
  }

  // Real-time listener for a specific document (simplified)
  onDocSnapshot(id, callback) {
    // For PostgreSQL, return current data
    setTimeout(async () => {
      try {
        await this.ensureInitialized();
        const data = await this.get(id);
        callback(data);
      } catch (error) {
        console.error(`Failed to load document ${id} for ${this.entityName}:`, error);
        callback(null);
      }
    }, 0);
    
    return () => {}; // Return empty unsubscribe function
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // Check if using PostgreSQL (always true)
  isUsingPostgreSQL() {
    return true;
  }

  // Clear all data for this entity
  async clearAll() {
    await this.ensureInitialized();
    const storage = this.getStorageEntity();
    try {
      // Get all records first
      const allRecords = await storage.list();
      
      // Delete each record
      await Promise.all(allRecords.map(record => storage.delete(record.id)));
      
      return true;
    } catch (error) {
      console.error(`PostgreSQL clearAll failed for ${this.entityName}:`, error);
      throw error;
    }
  }
}

// Create PostgreSQL entities
export const Student = new PostgreSQLEntity(PostgresStudent, 'students');
export const DailyEvaluation = new PostgreSQLEntity(PostgresDailyEvaluation, 'daily_evaluations');
export const Settings = new PostgreSQLEntity(PostgresSettings, 'settings');
export const ContactLog = new PostgreSQLEntity(PostgresContactLog, 'contact_logs');
export const BehaviorSummary = new PostgreSQLEntity(PostgresBehaviorSummary, 'behavior_summaries');
export const IncidentReport = new PostgreSQLEntity(PostgresIncidentReport, 'incident_reports');
export const User = new PostgreSQLEntity(PostgresUser, 'users');

// Utility function to check storage type (always PostgreSQL)
export const getStorageType = async () => {
  const postgresAvailable = await isPostgresAvailable();
  if (postgresAvailable) return 'postgresql';
  throw new Error('PostgreSQL is not available. Please configure your database connection.');
};

// Initialize sample data if needed
export const initializeSampleData = async () => {
  try {
    // First check if PostgreSQL is available
    const postgresAvailable = await isPostgresAvailable();
    if (!postgresAvailable) {
      console.log('PostgreSQL not available - skipping sample data initialization');
      return false;
    }

    const storageType = await getStorageType();
    
    // Check if we already have data
    const students = await Student.list();
    if (students.length === 0) {
      console.log('PostgreSQL is empty. Populating with sample data...');
      await populatePostgresSampleData();
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
    return false;
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

  const sampleSettings = [
    { key: 'teacher_name', value: 'Ms. Johnson' },
    { key: 'school_name', value: 'Bright Track Elementary' },
    { key: 'evaluation_periods', value: '9' },
    { key: 'max_score', value: '5' }
  ];

  try {
    // Add students
    for (const studentData of sampleStudents) {
      await Student.create(studentData);
    }

    // Add settings
    for (const settingData of sampleSettings) {
      await Settings.create(settingData);
    }

    // Add some sample evaluations for the first student
    const students = await Student.list();
    if (students.length > 0) {
      const firstStudent = students[0];
      const today = new Date().toISOString().split('T')[0];
      
      const sampleEvaluations = [];
      for (let period = 1; period <= 8; period++) {
        sampleEvaluations.push({
          student_id: firstStudent.id,
          evaluation_date: today,
          period: period,
          score: Math.floor(Math.random() * 5) + 1,
          notes: `Period ${period} evaluation`,
          created_at: new Date().toISOString()
        });
      }

      for (const evalData of sampleEvaluations) {
        await DailyEvaluation.create(evalData);
      }
    }

    console.log('Sample data populated successfully in PostgreSQL');
  } catch (error) {
    console.error('Failed to populate sample data:', error);
    throw error;
  }
}