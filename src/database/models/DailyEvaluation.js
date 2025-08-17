import { executeQuery } from '../connection.js';

export class DailyEvaluation {
  /**
   * Get all daily evaluations
   */
  static async list() {
    try {
      const query = `
        SELECT de.id, de.student_id, de.date, de.teacher_name, de.school,
               de.time_slots, de.general_comments, de.created_at, de.updated_at,
               s.student_name
        FROM daily_evaluations de
        LEFT JOIN students s ON de.student_id = s.id
        ORDER BY de.date DESC, s.student_name ASC
      `;
      const results = executeQuery(query);
      
      // Parse JSON time_slots
      return results.map(row => ({
        ...row,
        time_slots: row.time_slots ? JSON.parse(row.time_slots) : {}
      }));
    } catch (error) {
      console.error('Error fetching daily evaluations:', error);
      throw error;
    }
  }

  /**
   * Get daily evaluation by ID
   */
  static async get(id) {
    try {
      const query = `
        SELECT de.id, de.student_id, de.date, de.teacher_name, de.school,
               de.time_slots, de.general_comments, de.created_at, de.updated_at,
               s.student_name
        FROM daily_evaluations de
        LEFT JOIN students s ON de.student_id = s.id
        WHERE de.id = ?
      `;
      const results = executeQuery(query, [id]);
      const row = results[0];
      
      if (!row) return null;
      
      return {
        ...row,
        time_slots: row.time_slots ? JSON.parse(row.time_slots) : {}
      };
    } catch (error) {
      console.error('Error fetching daily evaluation:', error);
      throw error;
    }
  }

  /**
   * Filter daily evaluations
   */
  static async filter(filters = {}) {
    try {
      let query = `
        SELECT de.id, de.student_id, de.date, de.teacher_name, de.school,
               de.time_slots, de.general_comments, de.created_at, de.updated_at,
               s.student_name
        FROM daily_evaluations de
        LEFT JOIN students s ON de.student_id = s.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.student_id) {
        query += ` AND de.student_id = ?`;
        params.push(filters.student_id);
      }

      if (filters.date) {
        query += ` AND de.date = ?`;
        params.push(filters.date);
      }

      if (filters.teacher_name) {
        query += ` AND de.teacher_name LIKE ?`;
        params.push(`%${filters.teacher_name}%`);
      }

      if (filters.start_date && filters.end_date) {
        query += ` AND de.date BETWEEN ? AND ?`;
        params.push(filters.start_date, filters.end_date);
      }

      query += ` ORDER BY de.date DESC, s.student_name ASC`;

      const results = executeQuery(query, params);
      
      // Parse JSON time_slots
      return results.map(row => ({
        ...row,
        time_slots: row.time_slots ? JSON.parse(row.time_slots) : {}
      }));
    } catch (error) {
      console.error('Error filtering daily evaluations:', error);
      throw error;
    }
  }

  /**
   * Create new daily evaluation
   */
  static async create(data) {
    try {
      const query = `
        INSERT INTO daily_evaluations (student_id, date, teacher_name, school, time_slots, general_comments)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const result = executeQuery(query, [
        data.student_id,
        data.date,
        data.teacher_name || null,
        data.school || null,
        JSON.stringify(data.time_slots || {}),
        data.general_comments || null
      ]);
      
      return this.get(result.lastInsertRowid);
    } catch (error) {
      console.error('Error creating daily evaluation:', error);
      throw error;
    }
  }

  /**
   * Update daily evaluation
   */
  static async update(id, data) {
    try {
      const query = `
        UPDATE daily_evaluations 
        SET teacher_name = ?, school = ?, time_slots = ?, general_comments = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = executeQuery(query, [
        data.teacher_name || null,
        data.school || null,
        JSON.stringify(data.time_slots || {}),
        data.general_comments || null,
        id
      ]);
      
      if (result.changes === 0) {
        throw new Error('Daily evaluation not found');
      }
      
      return this.get(id);
    } catch (error) {
      console.error('Error updating daily evaluation:', error);
      throw error;
    }
  }

  /**
   * Delete daily evaluation
   */
  static async delete(id) {
    try {
      const query = `DELETE FROM daily_evaluations WHERE id = ?`;
      const result = executeQuery(query, [id]);
      
      if (result.changes === 0) {
        throw new Error('Daily evaluation not found');
      }
      
      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Error deleting daily evaluation:', error);
      throw error;
    }
  }

  /**
   * Get evaluations by date range
   */
  static async getByDateRange(startDate, endDate, studentId = null) {
    try {
      let query = `
        SELECT de.id, de.student_id, de.date, de.teacher_name, de.school,
               de.time_slots, de.general_comments, de.created_at, de.updated_at,
               s.student_name
        FROM daily_evaluations de
        LEFT JOIN students s ON de.student_id = s.id
        WHERE de.date BETWEEN ? AND ?
      `;
      const params = [startDate, endDate];

      if (studentId) {
        query += ` AND de.student_id = ?`;
        params.push(studentId);
      }

      query += ` ORDER BY de.date DESC, s.student_name ASC`;

      const results = executeQuery(query, params);
      
      return results.map(row => ({
        ...row,
        time_slots: row.time_slots ? JSON.parse(row.time_slots) : {}
      }));
    } catch (error) {
      console.error('Error fetching evaluations by date range:', error);
      throw error;
    }
  }

  /**
   * Get latest evaluation for each student
   */
  static async getLatestForAllStudents() {
    try {
      const query = `
        SELECT de.id, de.student_id, de.date, de.teacher_name, de.school,
               de.time_slots, de.general_comments, de.created_at, de.updated_at,
               s.student_name
        FROM daily_evaluations de
        LEFT JOIN students s ON de.student_id = s.id
        WHERE de.date = (
          SELECT MAX(date) 
          FROM daily_evaluations de2 
          WHERE de2.student_id = de.student_id
        )
        ORDER BY s.student_name ASC
      `;
      
      const results = executeQuery(query);
      
      return results.map(row => ({
        ...row,
        time_slots: row.time_slots ? JSON.parse(row.time_slots) : {}
      }));
    } catch (error) {
      console.error('Error fetching latest evaluations:', error);
      throw error;
    }
  }
}