// Supabase storage implementation
import { supabase } from '../config/supabase.js';

const isBrowser = typeof window !== 'undefined';

class SupabaseEntity {
  constructor(tableName, entityName) {
    this.tableName = tableName;
    this.entityName = entityName;
    this.listeners = new Set();
    this.isAvailable = null;
    this.initializationPromise = null;
  }

  async initializeStorage() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        if (!supabase) {
          console.warn(`Supabase not configured for ${this.entityName}`);
          this.isAvailable = false;
          return false;
        }

        // Test connection with a simple query
        const { error } = await supabase.from(this.tableName).select('id', { count: 'exact', head: true });
        
        if (error) {
          console.warn(`Supabase table ${this.tableName} not accessible:`, error.message);
          this.isAvailable = false;
          return false;
        }

        this.isAvailable = true;
        console.log(`${this.entityName} using: Supabase`);
        return true;
      } catch (error) {
        console.warn(`Supabase initialization failed for ${this.entityName}:`, error.message);
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
    if (!this.isAvailable) {
      throw new Error(`Supabase not available for ${this.entityName}. Please check your configuration.`);
    }
  }

  // Create a new record
  async create(data) {
    await this.ensureInitialized();
    const { data: result, error } = await supabase
      .from(this.tableName)
      .insert(data)
      .select()
      .single();
    
    if (error) throw new Error(`Create failed: ${error.message}`);
    return result;
  }

  // Get a record by ID
  async get(id) {
    await this.ensureInitialized();
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw new Error(`Get failed: ${error.message}`);
    }
    return data;
  }

  // List all records
  async list(orderBy = 'created_at') {
    await this.ensureInitialized();
    let query = supabase.from(this.tableName).select('*');
    
    if (orderBy) {
      query = query.order(orderBy);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`List failed: ${error.message}`);
    return data || [];
  }

  // Filter records
  async filter(filters) {
    await this.ensureInitialized();
    let query = supabase.from(this.tableName).select('*');
    
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && value !== undefined) {
        query = query.eq(key, value);
      }
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Filter failed: ${error.message}`);
    return data || [];
  }

  // Update a record
  async update(id, data) {
    await this.ensureInitialized();
    const { data: result, error } = await supabase
      .from(this.tableName)
      .update(data)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw new Error(`Update failed: ${error.message}`);
    return result;
  }

  // Delete a record
  async delete(id) {
    await this.ensureInitialized();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);
    
    if (error) throw new Error(`Delete failed: ${error.message}`);
    return true;
  }

  // Save (create or update)
  async save(data) {
    if (data.id) {
      return await this.update(data.id, data);
    } else {
      return await this.create(data);
    }
  }

  // Save multiple records
  async saveAll(dataArray) {
    await this.ensureInitialized();
    const results = [];
    
    for (const item of dataArray) {
      try {
        const result = await this.save(item);
        results.push(result);
      } catch (error) {
        console.error(`Failed to save item in ${this.entityName}:`, error);
        throw error;
      }
    }
    
    return results;
  }

  // Real-time listener for changes
  onSnapshot(callback) {
    if (!supabase) {
      console.warn(`Supabase not available for ${this.entityName} subscription`);
      return () => {};
    }

    // Set up real-time subscription
    const subscription = supabase
      .channel(`${this.tableName}_changes`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: this.tableName },
        async () => {
          // Fetch latest data when changes occur
          try {
            const data = await this.list();
            callback(data);
          } catch (error) {
            console.error(`Failed to fetch data after change in ${this.entityName}:`, error);
          }
        }
      )
      .subscribe();

    // Also fetch initial data
    setTimeout(async () => {
      try {
        const data = await this.list();
        callback(data);
      } catch (error) {
        console.debug(`Failed to load initial data for ${this.entityName}:`, error);
        callback([]);
      }
    }, 0);

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  }

  // Real-time listener for a specific document
  onDocSnapshot(id, callback) {
    if (!supabase) {
      console.warn(`Supabase not available for ${this.entityName} document subscription`);
      return () => {};
    }

    // Set up real-time subscription for this specific record
    const subscription = supabase
      .channel(`${this.tableName}_${id}_changes`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: this.tableName, filter: `id=eq.${id}` },
        async () => {
          // Fetch latest data when this record changes
          try {
            const data = await this.get(id);
            callback(data);
          } catch (error) {
            console.error(`Failed to fetch document ${id} after change in ${this.entityName}:`, error);
          }
        }
      )
      .subscribe();

    // Fetch initial data
    setTimeout(async () => {
      try {
        const data = await this.get(id);
        callback(data);
      } catch (error) {
        console.debug(`Failed to load document ${id} for ${this.entityName}:`, error);
        callback(null);
      }
    }, 0);

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(subscription);
    };
  }

  // Clean up all listeners
  cleanup() {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
  }

  // Check if using Supabase (always true)
  isUsingSupabase() {
    return true;
  }

  // Clear all data for this entity (use with caution!)
  async clearAll() {
    await this.ensureInitialized();
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .neq('id', 0); // Delete all records (where id != 0, which should be all)
    
    if (error) throw new Error(`Clear all failed: ${error.message}`);
    return true;
  }
}

// Create Supabase entities for each table
export const Student = new SupabaseEntity('students', 'students');
export const DailyEvaluation = new SupabaseEntity('daily_evaluations', 'daily_evaluations');
export const Settings = new SupabaseEntity('settings', 'settings');
export const ContactLog = new SupabaseEntity('contact_logs', 'contact_logs');
export const BehaviorSummary = new SupabaseEntity('behavior_summaries', 'behavior_summaries');
export const IncidentReport = new SupabaseEntity('incident_reports', 'incident_reports');
export const User = new SupabaseEntity('users', 'users');

// Utility function to check storage type
export const getStorageType = async () => {
  if (!supabase) return 'error';
  
  try {
    // Test connection with a simple query
    const { error } = await supabase.from('students').select('id', { count: 'exact', head: true });
    return error ? 'error' : 'supabase';
  } catch {
    return 'error';
  }
};

// Check if Supabase is available
export const isSupabaseAvailable = async () => {
  if (!supabase) return false;
  
  try {
    const { error } = await supabase.from('students').select('id', { count: 'exact', head: true });
    return !error;
  } catch {
    return false;
  }
};

// Initialize sample data if needed
export const initializeSampleData = async () => {
  try {
    const available = await isSupabaseAvailable();
    if (!available) {
      console.log('Supabase not available - skipping sample data initialization');
      return false;
    }

    // Check if we already have data
    const students = await Student.list();
    if (students.length === 0) {
      console.log('Supabase is empty. Populating with sample data...');
      await populateSupabaseSampleData();
    }
    return true;
  } catch (error) {
    console.error('Failed to initialize sample data:', error);
    return false;
  }
};

// Populate Supabase with sample data
async function populateSupabaseSampleData() {
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

      try {
        await DailyEvaluation.create(sampleEvaluation);
      } catch (error) {
        // Skip if evaluation already exists
        if (!error.message.includes('duplicate key')) {
          throw error;
        }
      }
    }

    console.log('Sample data populated successfully in Supabase');
  } catch (error) {
    console.error('Failed to populate sample data:', error);
    throw error;
  }
}
