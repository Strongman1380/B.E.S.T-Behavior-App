// Browser-safe: avoid static Node core imports so bundlers don't error.
const isBrowser = typeof window !== 'undefined';
let PoolRef = null; // cached pg.Pool
let readFileSyncRef = null; // cached fs.readFileSync
let pool = null; // instantiated pool

async function ensurePg() {
  if (isBrowser) throw new Error('PostgreSQL not available in browser');
  if (!PoolRef) {
    const mod = await import('pg');
    PoolRef = mod.Pool;
  }
  return PoolRef;
}

async function ensureFs() {
  if (isBrowser) throw new Error('PostgreSQL not available in browser');
  if (!readFileSyncRef) {
    const mod = await import('fs');
    readFileSyncRef = mod.readFileSync;
  }
  return readFileSyncRef;
}

/**
 * Initialize the PostgreSQL connection pool
 */
export async function initializeDatabase() {
  if (isBrowser) throw new Error('PostgreSQL not available in browser');
  if (pool) return pool;
  
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.log('⚠️  No DATABASE_URL configured - running in demo mode without PostgreSQL');
    return null;
  }
  
  try {
    const Pool = await ensurePg();
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
    console.log('✅ PostgreSQL connection pool initialized successfully');
    return pool;
  } catch (error) {
    console.warn('⚠️  PostgreSQL connection failed, running in demo mode:', error.message);
    return null;
  }
}

/**
 * Get database connection pool
 */
export async function getDatabase() {
  if (isBrowser) throw new Error('PostgreSQL not available in browser');
  if (!pool) {
    const result = await initializeDatabase();
    if (!result) {
      throw new Error('PostgreSQL not available - running in demo mode');
    }
    return result;
  }
  return pool;
}

/**
 * Close database connection pool
 */
export async function closeDatabase() {
  if (isBrowser) return;
  if (pool) {
    await pool.end();
    pool = null;
    console.log('PostgreSQL connection pool closed');
  }
}

/**
 * Execute a query with parameters
 */
export async function executeQuery(query, params = []) {
  if (isBrowser) throw new Error('PostgreSQL not available in browser');
  try {
    const database = await getDatabase();
    const result = await database.query(query, params);
    return result.rows;
  } catch (error) {
    if (error.message.includes('PostgreSQL not available')) {
      throw new Error('Database not configured - running in demo mode');
    }
    console.error('PostgreSQL query execution error:', error);
    console.error('Query:', query);
    console.error('Params:', params);
    throw error;
  }
}

/**
 * Execute multiple queries in a transaction
 */
export async function executeTransaction(queries) {
  if (isBrowser) throw new Error('PostgreSQL not available in browser');
  const database = await getDatabase();
  const client = await database.connect();
  
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const { query, params = [] } of queries) {
      const result = await client.query(query, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize database schema
 */
export async function initializeSchema() {
  if (isBrowser) throw new Error('PostgreSQL not available in browser');
  
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!connectionString) {
    console.log('⚠️  No DATABASE_URL configured - skipping schema initialization');
    return;
  }
  
  try {
    // Resolve relative to this module without using Node's path/url helpers
    const schemaUrl = new URL('./postgres-schema.sql', import.meta.url);
    const readFileSync = await ensureFs();
    const schema = readFileSync(schemaUrl, 'utf8');
    
    // Execute the entire schema as one statement to handle functions properly
    await executeQuery(schema);
    console.log('✅ PostgreSQL schema initialized successfully');
  } catch (error) {
    console.warn('⚠️  PostgreSQL schema initialization failed, running in demo mode:', error.message);
  }
}

// Initialize database when module is imported (server-side only)
// No automatic initialization to avoid unhandled promise rejections; caller decides.
