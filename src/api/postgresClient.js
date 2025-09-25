import pkg from 'pg';
const { Pool } = pkg;

// Initialize PostgreSQL connection pool
let pool = null;
let isAvailable = false;

// Initialize PostgreSQL connection
try {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl && databaseUrl !== 'postgresql://postgres:[YOUR-PASSWORD]@db.teiupxwqnbwopnixulay.supabase.co:5432/postgres') {
    pool = new Pool({
      connectionString: databaseUrl,
      ssl: { rejectUnauthorized: false }
    });
    isAvailable = true;
  }
} catch (error) {
  console.warn('PostgreSQL connection not available:', error.message);
  isAvailable = false;
}

export const isPostgresAvailable = isAvailable;

// Base PostgreSQL entity class
class PostgreSQLEntity {
  constructor(model, tableName) {
    this.model = model;
    this.tableName = tableName;
  }

  async query(sql, params = []) {
    if (!pool) throw new Error('PostgreSQL not configured');
    const client = await pool.connect();
    try {
      const result = await client.query(sql, params);
      return result;
    } finally {
      client.release();
    }
  }

  async getAll() {
    const result = await this.query(`SELECT * FROM ${this.tableName} ORDER BY id DESC`);
    return result.rows;
  }

  async getById(id) {
    const result = await this.query(`SELECT * FROM ${this.tableName} WHERE id = $1`, [id]);
    return result.rows[0] || null;
  }

  async save(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
    const columns = keys.join(', ');

    const sql = `INSERT INTO ${this.tableName} (${columns}) VALUES (${placeholders}) RETURNING *`;
    const result = await this.query(sql, values);
    return result.rows[0];
  }

  async update(id, data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const setClause = keys.map((key, i) => `${key} = $${i + 1}`).join(', ');

    const sql = `UPDATE ${this.tableName} SET ${setClause} WHERE id = $${keys.length + 1} RETURNING *`;
    const result = await this.query(sql, [...values, id]);
    return result.rows[0];
  }

  async delete(id) {
    const sql = `DELETE FROM ${this.tableName} WHERE id = $1 RETURNING *`;
    const result = await this.query(sql, [id]);
    return result.rows[0];
  }
}

// Define the models
export const Student = new PostgreSQLEntity(null, 'students');
export const DailyEvaluation = new PostgreSQLEntity(null, 'daily_evaluations');
export const Settings = new PostgreSQLEntity(null, 'settings');
export const ContactLog = new PostgreSQLEntity(null, 'contact_logs');
export const BehaviorSummary = new PostgreSQLEntity(null, 'behavior_summaries');
export const IncidentReport = new PostgreSQLEntity(null, 'incident_reports');
export const User = new PostgreSQLEntity(null, 'users');
export const Dashboard = new PostgreSQLEntity(null, 'dashboards');

export default pool;
