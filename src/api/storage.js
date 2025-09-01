// Hybrid storage: Supabase for browser, PostgreSQL for server
import { 
  Student as PostgresStudent, 
  DailyEvaluation as PostgresDailyEvaluation, 
  Settings as PostgresSettings, 
  ContactLog as PostgresContactLog, 
  BehaviorSummary as PostgresBehaviorSummary,
  IncidentReport as PostgresIncidentReport,
  User as PostgresUser,
  isPostgresAvailable
} from './postgresClient.js';

// Import Supabase storage for browser
import {
  Student as SupabaseStudent,
  DailyEvaluation as SupabaseDailyEvaluation,
  Settings as SupabaseSettings,
  ContactLog as SupabaseContactLog,
  BehaviorSummary as SupabaseBehaviorSummary,
  IncidentReport as SupabaseIncidentReport,
  User as SupabaseUser,
  getStorageType as getSupabaseStorageType
} from './supabaseStorage.js';

const isBrowser = typeof window !== 'undefined';

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
        // In the browser, always assume available and let API calls handle errors
        if (isBrowser) {
          this.isAvailable = true;
          console.log(`${this.entityName} using: PostgreSQL via API`);
          return true;
        }
        // Server-side: check PostgreSQL availability
        this.isAvailable = await isPostgresAvailable();
        
        if (!this.isAvailable) {
          // In server context, warn about missing PostgreSQL
          if (!isBrowser) {
            console.warn(`PostgreSQL is not available for ${this.entityName}. Please configure your database connection.`);
          }
          // Don't throw error, let individual operations handle it
          return false;
        }
        
        console.log(`${this.entityName} using: PostgreSQL direct`);
        return true;
      } catch (error) {
        console.warn(`Storage initialization warning for ${this.entityName}:`, error.message);
        this.isAvailable = false;
        return false;
      }
    })();

    return this.initializationPromise;
  }

  async ensureInitialized() {
    if (this.isAvailable === null) {
      await this.initializeStorage();
    }
    // In the browser, always proceed and let API calls handle errors
    if (isBrowser) {
      return;
    }
    // Server-side: warn but don't block if PostgreSQL is not available
    if (!isBrowser && !this.isAvailable) {
      console.warn(`PostgreSQL is not available for ${this.entityName}. Operations may fail.`);
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
      if (isBrowser) {
        // In browser, just log debug info without scary error messages
        console.debug(`PostgreSQL create failed for ${this.entityName}, likely API not configured`);
      } else {
        console.error(`PostgreSQL create failed for ${this.entityName}:`, error);
      }
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
      if (isBrowser) {
        console.debug(`PostgreSQL get failed for ${this.entityName}, likely API not configured`);
      } else {
        console.error(`PostgreSQL get failed for ${this.entityName}:`, error);
      }
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
      if (isBrowser) {
        console.debug(`PostgreSQL list failed for ${this.entityName}, likely API not configured`);
      } else {
        console.error(`PostgreSQL list failed for ${this.entityName}:`, error);
      }
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
  onSnapshot(callback) {
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

// Export entities based on environment
export const Student = isBrowser ? SupabaseStudent : new PostgreSQLEntity(PostgresStudent, 'students');
export const DailyEvaluation = isBrowser ? SupabaseDailyEvaluation : new PostgreSQLEntity(PostgresDailyEvaluation, 'daily_evaluations');
export const Settings = isBrowser ? SupabaseSettings : new PostgreSQLEntity(PostgresSettings, 'settings');
export const ContactLog = isBrowser ? SupabaseContactLog : new PostgreSQLEntity(PostgresContactLog, 'contact_logs');
export const BehaviorSummary = isBrowser ? SupabaseBehaviorSummary : new PostgreSQLEntity(PostgresBehaviorSummary, 'behavior_summaries');
export const IncidentReport = isBrowser ? SupabaseIncidentReport : new PostgreSQLEntity(PostgresIncidentReport, 'incident_reports');
export const User = isBrowser ? SupabaseUser : new PostgreSQLEntity(PostgresUser, 'users');

// Utility function to check storage type
export const getStorageType = async () => {
  if (isBrowser) {
    return await getSupabaseStorageType();
  } else {
    const postgresAvailable = await isPostgresAvailable();
    if (postgresAvailable) return 'postgresql';
    return 'error';
  }
};

// Initialize sample data if needed
export const initializeSampleData = async () => {
  if (isBrowser) {
    // In browser with Supabase, we don't initialize sample data
    // This would typically be done by a server or manually in Supabase dashboard
    console.log('Sample data initialization skipped in browser (Supabase)');
    return false;
  }
  
  try {
    // Server-side: check PostgreSQL availability and populate if needed
    const postgresAvailable = await isPostgresAvailable();
    if (!postgresAvailable) {
      console.log('PostgreSQL not available - skipping sample data initialization');
      return false;
    }

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

  const sampleSettings = {
    teacher_name: 'Ms. Johnson',
    school_name: 'Bright Track Elementary',
    academic_year: '2024-2025',
    grading_scale: {
      excellent: 5,
      good: 4,
      satisfactory: 3,
      needs_improvement: 2,
      unsatisfactory: 1
    },
    notification_preferences: {
      email_notifications: true,
      daily_summaries: true
    }
  };

  try {
    // Add students
    for (const studentData of sampleStudents) {
      try {
        await Student.create(studentData);
      } catch (error) {
        // Skip if student already exists
        if (!error.message.includes('duplicate key')) {
          throw error;
        }
      }
    }

    // Add settings (check if exists first)
    try {
      const existingSettings = await Settings.list();
      if (existingSettings.length === 0) {
        await Settings.create(sampleSettings);
      }
    } catch (error) {
      // Skip if settings already exist
      if (!error.message.includes('duplicate key')) {
        throw error;
      }
    }

    // Add some sample evaluations for the first student
    const students = await Student.list();
    if (students.length > 0) {
      const firstStudent = students[0];
      const today = new Date().toISOString().split('T')[0];
      
      const timeSlots = {};
      for (let period = 1; period <= 8; period++) {
        timeSlots[`period_${period}`] = {
          score: Math.floor(Math.random() * 5) + 1,
          notes: `Period ${period} evaluation`
        };
      }

      const sampleEvaluation = {
        student_id: firstStudent.id,
        date: today,
        teacher_name: 'Ms. Johnson',
        school: 'Bright Track Elementary',
        time_slots: timeSlots,
        general_comments: 'Sample evaluation for demonstration purposes'
      };

      await DailyEvaluation.create(sampleEvaluation);
    }

    console.log('Sample data populated successfully in PostgreSQL');
  } catch (error) {
    console.error('Failed to populate sample data:', error);
    throw error;
  }
}
