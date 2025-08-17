import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Database file path
const DB_PATH = join(process.cwd(), 'bright-track.db');

let db = null;

/**
 * Initialize the SQLite database
 */
export function initializeDatabase() {
  try {
    // Create database connection
    db = new Database(DB_PATH);
    
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Read and execute schema
    const schemaPath = join(__dirname, 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf8');
    
    // Split schema by semicolons and execute each statement
    const statements = schema.split(';').filter(stmt => stmt.trim());
    
    statements.forEach(statement => {
      if (statement.trim()) {
        db.exec(statement);
      }
    });
    
    console.log('✅ Database initialized successfully');
    return db;
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

/**
 * Get database connection
 */
export function getDatabase() {
  if (!db) {
    return initializeDatabase();
  }
  return db;
}

/**
 * Close database connection
 */
export function closeDatabase() {
  if (db) {
    db.close();
    db = null;
    console.log('Database connection closed');
  }
}

/**
 * Execute a query with parameters
 */
export function executeQuery(query, params = []) {
  const database = getDatabase();
  try {
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      return database.prepare(query).all(params);
    } else {
      return database.prepare(query).run(params);
    }
  } catch (error) {
    console.error('Query execution error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 */
export function executeTransaction(queries) {
  const database = getDatabase();
  const transaction = database.transaction(() => {
    const results = [];
    queries.forEach(({ query, params = [] }) => {
      const result = database.prepare(query).run(params);
      results.push(result);
    });
    return results;
  });
  
  return transaction();
}

// Initialize database when module is imported
if (typeof window === 'undefined') {
  // Only initialize on server side (Node.js)
  initializeDatabase();
}