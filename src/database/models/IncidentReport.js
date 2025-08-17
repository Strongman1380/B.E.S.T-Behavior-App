import { executeQuery } from '../connection.js';

export class IncidentReport {
  /**
   * Get all incident reports
   */
  static async list() {
    try {
      const query = `
        SELECT ir.id, ir.student_id, ir.incident_date, ir.incident_time, ir.location,
               ir.incident_type, ir.severity_level, ir.description, ir.action_taken,
               ir.reported_by, ir.follow_up_required, ir.follow_up_notes,
               ir.created_at, ir.updated_at, s.student_name
        FROM incident_reports ir
        LEFT JOIN students s ON ir.student_id = s.id
        ORDER BY ir.incident_date DESC, ir.incident_time DESC
      `;
      return executeQuery(query);
    } catch (error) {
      console.error('Error fetching incident reports:', error);
      throw error;
    }
  }

  /**
   * Get incident report by ID
   */
  static async get(id) {
    try {
      const query = `
        SELECT ir.id, ir.student_id, ir.incident_date, ir.incident_time, ir.location,
               ir.incident_type, ir.severity_level, ir.description, ir.action_taken,
               ir.reported_by, ir.follow_up_required, ir.follow_up_notes,
               ir.created_at, ir.updated_at, s.student_name
        FROM incident_reports ir
        LEFT JOIN students s ON ir.student_id = s.id
        WHERE ir.id = ?
      `;
      const results = executeQuery(query, [id]);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching incident report:', error);
      throw error;
    }
  }

  /**
   * Filter incident reports
   */
  static async filter(filters = {}) {
    try {
      let query = `
        SELECT ir.id, ir.student_id, ir.incident_date, ir.incident_time, ir.location,
               ir.incident_type, ir.severity_level, ir.description, ir.action_taken,
               ir.reported_by, ir.follow_up_required, ir.follow_up_notes,
               ir.created_at, ir.updated_at, s.student_name
        FROM incident_reports ir
        LEFT JOIN students s ON ir.student_id = s.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.student_id) {
        query += ` AND ir.student_id = ?`;
        params.push(filters.student_id);
      }

      if (filters.incident_date) {
        query += ` AND ir.incident_date = ?`;
        params.push(filters.incident_date);
      }

      if (filters.incident_type) {
        query += ` AND ir.incident_type = ?`;
        params.push(filters.incident_type);
      }

      if (filters.severity_level) {
        query += ` AND ir.severity_level = ?`;
        params.push(filters.severity_level);
      }

      if (filters.location) {
        query += ` AND ir.location LIKE ?`;
        params.push(`%${filters.location}%`);
      }

      if (filters.reported_by) {
        query += ` AND ir.reported_by LIKE ?`;
        params.push(`%${filters.reported_by}%`);
      }

      if (filters.follow_up_required !== undefined) {
        query += ` AND ir.follow_up_required = ?`;
        params.push(filters.follow_up_required ? 1 : 0);
      }

      if (filters.start_date && filters.end_date) {
        query += ` AND ir.incident_date BETWEEN ? AND ?`;
        params.push(filters.start_date, filters.end_date);
      }

      query += ` ORDER BY ir.incident_date DESC, ir.incident_time DESC`;

      return executeQuery(query, params);
    } catch (error) {
      console.error('Error filtering incident reports:', error);
      throw error;
    }
  }

  /**
   * Create new incident report
   */
  static async create(data) {
    try {
      const query = `
        INSERT INTO incident_reports (
          student_id, incident_date, incident_time, location, incident_type,
          severity_level, description, action_taken, reported_by,
          follow_up_required, follow_up_notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = executeQuery(query, [
        data.student_id,
        data.incident_date,
        data.incident_time || null,
        data.location || null,
        data.incident_type,
        data.severity_level,
        data.description,
        data.action_taken || null,
        data.reported_by || null,
        data.follow_up_required ? 1 : 0,
        data.follow_up_notes || null
      ]);
      
      return this.get(result.lastInsertRowid);
    } catch (error) {
      console.error('Error creating incident report:', error);
      throw error;
    }
  }

  /**
   * Update incident report
   */
  static async update(id, data) {
    try {
      const query = `
        UPDATE incident_reports 
        SET student_id = ?, incident_date = ?, incident_time = ?, location = ?,
            incident_type = ?, severity_level = ?, description = ?, action_taken = ?,
            reported_by = ?, follow_up_required = ?, follow_up_notes = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = executeQuery(query, [
        data.student_id,
        data.incident_date,
        data.incident_time || null,
        data.location || null,
        data.incident_type,
        data.severity_level,
        data.description,
        data.action_taken || null,
        data.reported_by || null,
        data.follow_up_required ? 1 : 0,
        data.follow_up_notes || null,
        id
      ]);
      
      if (result.changes === 0) {
        throw new Error('Incident report not found');
      }
      
      return this.get(id);
    } catch (error) {
      console.error('Error updating incident report:', error);
      throw error;
    }
  }

  /**
   * Delete incident report
   */
  static async delete(id) {
    try {
      const query = `DELETE FROM incident_reports WHERE id = ?`;
      const result = executeQuery(query, [id]);
      
      if (result.changes === 0) {
        throw new Error('Incident report not found');
      }
      
      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Error deleting incident report:', error);
      throw error;
    }
  }

  /**
   * Get incident reports by student
   */
  static async getByStudent(studentId) {
    try {
      const query = `
        SELECT ir.id, ir.student_id, ir.incident_date, ir.incident_time, ir.location,
               ir.incident_type, ir.severity_level, ir.description, ir.action_taken,
               ir.reported_by, ir.follow_up_required, ir.follow_up_notes,
               ir.created_at, ir.updated_at, s.student_name
        FROM incident_reports ir
        LEFT JOIN students s ON ir.student_id = s.id
        WHERE ir.student_id = ?
        ORDER BY ir.incident_date DESC, ir.incident_time DESC
      `;
      return executeQuery(query, [studentId]);
    } catch (error) {
      console.error('Error fetching incident reports by student:', error);
      throw error;
    }
  }

  /**
   * Get incident reports requiring follow-up
   */
  static async getRequiringFollowUp() {
    try {
      const query = `
        SELECT ir.id, ir.student_id, ir.incident_date, ir.incident_time, ir.location,
               ir.incident_type, ir.severity_level, ir.description, ir.action_taken,
               ir.reported_by, ir.follow_up_required, ir.follow_up_notes,
               ir.created_at, ir.updated_at, s.student_name
        FROM incident_reports ir
        LEFT JOIN students s ON ir.student_id = s.id
        WHERE ir.follow_up_required = 1
        ORDER BY ir.incident_date DESC, ir.incident_time DESC
      `;
      return executeQuery(query);
    } catch (error) {
      console.error('Error fetching incident reports requiring follow-up:', error);
      throw error;
    }
  }

  /**
   * Get incident statistics
   */
  static async getStatistics(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          incident_type,
          severity_level,
          COUNT(*) as count,
          COUNT(DISTINCT student_id) as unique_students
        FROM incident_reports
      `;
      const params = [];

      if (startDate && endDate) {
        query += ` WHERE incident_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      }

      query += ` GROUP BY incident_type, severity_level ORDER BY count DESC`;

      return executeQuery(query, params);
    } catch (error) {
      console.error('Error fetching incident report statistics:', error);
      throw error;
    }
  }

  /**
   * Get severity level summary
   */
  static async getSeveritySummary(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          severity_level,
          COUNT(*) as count
        FROM incident_reports
      `;
      const params = [];

      if (startDate && endDate) {
        query += ` WHERE incident_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      }

      query += ` GROUP BY severity_level ORDER BY 
        CASE severity_level 
          WHEN 'Critical' THEN 1
          WHEN 'High' THEN 2
          WHEN 'Medium' THEN 3
          WHEN 'Low' THEN 4
          ELSE 5
        END`;

      return executeQuery(query, params);
    } catch (error) {
      console.error('Error fetching severity summary:', error);
      throw error;
    }
  }
}