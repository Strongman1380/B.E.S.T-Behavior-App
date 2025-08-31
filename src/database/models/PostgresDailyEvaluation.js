import { executeQuery } from '../postgres.js';

export class PostgresDailyEvaluation {
  /**
   * Get all daily evaluations
   */
  static async list() {
    try {
      const query = `
        SELECT id, student_id, date, teacher_name, school, time_slots, general_comments,
               created_at, updated_at
        FROM daily_evaluations 
        ORDER BY date DESC, created_at DESC
      `;
      const results = await executeQuery(query);
      
      // Parse JSON fields
      return results.map(row => ({
        ...row,
        time_slots: row.time_slots ? row.time_slots : {}
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
        SELECT id, student_id, date, teacher_name, school, time_slots, general_comments,
               created_at, updated_at
        FROM daily_evaluations 
        WHERE id = $1
      `;
      const results = await executeQuery(query, [id]);
      const row = results[0];
      
      if (!row) return null;
      
      return {
        ...row,
        time_slots: row.time_slots ? row.time_slots : {}
      };
    } catch (error) {
      console.error('Error fetching daily evaluation:', error);
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
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, student_id, date, teacher_name, school, time_slots, general_comments, created_at, updated_at
      `;
      const results = await executeQuery(query, [
        data.student_id,
        data.date,
        data.teacher_name || null,
        data.school || null,
        JSON.stringify(data.time_slots || {}),
        data.general_comments || null
      ]);
      
      const row = results[0];
      return {
        ...row,
        time_slots: row.time_slots ? row.time_slots : {}
      };
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
        SET student_id = $1, date = $2, teacher_name = $3, school = $4, 
            time_slots = $5, general_comments = $6
        WHERE id = $7
        RETURNING id, student_id, date, teacher_name, school, time_slots, general_comments, created_at, updated_at
      `;
      const results = await executeQuery(query, [
        data.student_id,
        data.date,
        data.teacher_name || null,
        data.school || null,
        JSON.stringify(data.time_slots || {}),
        data.general_comments || null,
        id
      ]);
      
      if (results.length === 0) {
        throw new Error('Daily evaluation not found');
      }
      
      const row = results[0];
      return {
        ...row,
        time_slots: row.time_slots ? row.time_slots : {}
      };
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
      const query = `DELETE FROM daily_evaluations WHERE id = $1 RETURNING id`;
      const results = await executeQuery(query, [id]);
      
      if (results.length === 0) {
        throw new Error('Daily evaluation not found');
      }
      
      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Error deleting daily evaluation:', error);
      throw error;
    }
  }

  /**
   * Get evaluations by student ID
   */
  static async getByStudent(studentId) {
    try {
      const query = `
        SELECT id, student_id, date, teacher_name, school, time_slots, general_comments,
               created_at, updated_at
        FROM daily_evaluations 
        WHERE student_id = $1
        ORDER BY date DESC
      `;
      const results = await executeQuery(query, [studentId]);
      
      return results.map(row => ({
        ...row,
        time_slots: row.time_slots ? row.time_slots : {}
      }));
    } catch (error) {
      console.error('Error fetching evaluations by student:', error);
      throw error;
    }
  }

  /**
   * Filter daily evaluations by criteria
   */
  static async filter(criteria) {
    try {
      let query = `
        SELECT id, student_id, date, teacher_name, school, time_slots, general_comments,
               created_at, updated_at
        FROM daily_evaluations 
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;

      Object.entries(criteria).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return;
        if (key === 'date_from') {
          paramCount++;
          conditions.push(`date >= $${paramCount}`);
          params.push(value);
          return;
        }
        if (key === 'date_to') {
          paramCount++;
          conditions.push(`date <= $${paramCount}`);
          params.push(value);
          return;
        }
        paramCount++;
        conditions.push(`${key} = $${paramCount}`);
        params.push(value);
      });

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY date DESC, created_at DESC';

      const results = await executeQuery(query, params);
      
      return results.map(row => ({
        ...row,
        time_slots: row.time_slots ? row.time_slots : {}
      }));
    } catch (error) {
      console.error('Error filtering daily evaluations:', error);
      throw error;
    }
  }

  /**
   * Save (create or update) daily evaluation
   */
  static async save(data) {
    if (data.id) {
      return await this.update(data.id, data);
    } else {
      return await this.create(data);
    }
  }

  /**
   * Save multiple daily evaluations
   */
  static async saveAll(dataArray) {
    const results = [];
    for (const data of dataArray) {
      const result = await this.save(data);
      results.push(result);
    }
    return results;
  }
}
