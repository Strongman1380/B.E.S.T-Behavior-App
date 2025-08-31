// Supabase-based storage - using Supabase PostgreSQL via API
import { 
  Student as SupabaseStudent, 
  DailyEvaluation as SupabaseDailyEvaluation, 
  Settings as SupabaseSettings, 
  ContactLog as SupabaseContactLog, 
  BehaviorSummary as SupabaseBehaviorSummary,
  IncidentReport as SupabaseIncidentReport,
  User as SupabaseUser,
  isSupabaseAvailable,
  getStorageType as getSupabaseStorageType,
  initializeSampleData as initSupabaseSampleData
} from './supabaseStorage.js';

// Supabase storage class
const isBrowser = typeof window !== 'undefined';

class SupabaseEntity {
  constructor(supabaseEntity, entityName) {
    this.supabaseEntity = supabaseEntity;
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
        // Always try to use Supabase (works in both browser and server)
        this.isAvailable = await isSupabaseAvailable();
        
        if (!this.isAvailable) {
          // In server context, warn about missing Supabase
          if (!isBrowser) {
            console.warn(`Supabase is not available for ${this.entityName}. Please configure your connection.`);
          }
          // Don't throw error, let individual operations handle it
          return false;
        }
        
        console.log(`${this.entityName} using: Supabase`);
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
    // Server-side: warn but don't block if Supabase is not available
    if (!isBrowser && !this.isAvailable) {
      console.warn(`Supabase is not available for ${this.entityName}. Operations may fail.`);
    }
  }

  // Get the storage entity (always Supabase)
  getStorageEntity() {
    return this.supabaseEntity;
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
        console.debug(`Supabase create failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase create failed for ${this.entityName}:`, error);
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
        console.debug(`Supabase get failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase get failed for ${this.entityName}:`, error);
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
        console.debug(`Supabase list failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase list failed for ${this.entityName}:`, error);
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
      if (isBrowser) {
        console.debug(`Supabase filter failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase filter failed for ${this.entityName}:`, error);
      }
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
      if (isBrowser) {
        console.debug(`Supabase update failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase update failed for ${this.entityName}:`, error);
      }
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
      if (isBrowser) {
        console.debug(`Supabase delete failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase delete failed for ${this.entityName}:`, error);
      }
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
      if (isBrowser) {
        console.debug(`Supabase save failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase save failed for ${this.entityName}:`, error);
      }
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
      if (isBrowser) {
        console.debug(`Supabase saveAll failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase saveAll failed for ${this.entityName}:`, error);
      }
      throw error;
    }
  }

  // Real-time listener for changes (with Supabase real-time subscriptions)
  onSnapshot(callback) {
    // For Supabase, use real-time subscriptions
    setTimeout(async () => {
      try {
        await this.ensureInitialized();
        const storage = this.getStorageEntity();
        const unsubscribe = storage.onSnapshot(callback);
        this.listeners.add(unsubscribe);
        return unsubscribe;
      } catch (error) {
        console.error(`Failed to set up subscription for ${this.entityName}:`, error);
        callback([]);
      }
    }, 0);
    
    return () => {}; // Return empty unsubscribe function
  }

  // Real-time listener for a specific document (with Supabase real-time)
  onDocSnapshot(id, callback) {
    // For Supabase, use real-time subscriptions
    setTimeout(async () => {
      try {
        await this.ensureInitialized();
        const storage = this.getStorageEntity();
        const unsubscribe = storage.onDocSnapshot(id, callback);
        this.listeners.add(unsubscribe);
        return unsubscribe;
      } catch (error) {
        console.error(`Failed to set up document subscription for ${this.entityName}:`, error);
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

  // Check if using Supabase (always true)
  isUsingSupabase() {
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
      if (isBrowser) {
        console.debug(`Supabase clearAll failed for ${this.entityName}, likely not configured`);
      } else {
        console.error(`Supabase clearAll failed for ${this.entityName}:`, error);
      }
      throw error;
    }
  }
}

// Create Supabase entities
export const Student = new SupabaseEntity(SupabaseStudent, 'students');
export const DailyEvaluation = new SupabaseEntity(SupabaseDailyEvaluation, 'daily_evaluations');
export const Settings = new SupabaseEntity(SupabaseSettings, 'settings');
export const ContactLog = new SupabaseEntity(SupabaseContactLog, 'contact_logs');
export const BehaviorSummary = new SupabaseEntity(SupabaseBehaviorSummary, 'behavior_summaries');
export const IncidentReport = new SupabaseEntity(SupabaseIncidentReport, 'incident_reports');
export const User = new SupabaseEntity(SupabaseUser, 'users');

// Utility function to check storage type (always Supabase)
export const getStorageType = async () => {
  return await getSupabaseStorageType();
};

// Initialize sample data if needed
export const initializeSampleData = async () => {
  return await initSupabaseSampleData();
};
