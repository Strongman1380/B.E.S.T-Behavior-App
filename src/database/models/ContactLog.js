import { executeQuery } from '../connection.js';

export class ContactLog {
  /**
   * Get all contact logs
   */
  static async list() {
    try {
      const query = `
        SELECT cl.id, cl.student_id, cl.contact_date, cl.contact_person_name,
               cl.contact_category, cl.purpose_of_contact, cl.created_at, cl.updated_at,
               s.student_name
        FROM contact_logs cl
        LEFT JOIN students s ON cl.student_id = s.id
        ORDER BY cl.contact_date DESC, s.student_name ASC
      `;
      return executeQuery(query);
    } catch (error) {
      console.error('Error fetching contact logs:', error);
      throw error;
    }
  }

  /**
   * Get contact log by ID
   */
  static async get(id) {
    try {
      const query = `
        SELECT cl.id, cl.student_id, cl.contact_date, cl.contact_person_name,
               cl.contact_category, cl.purpose_of_contact, cl.created_at, cl.updated_at,
               s.student_name
        FROM contact_logs cl
        LEFT JOIN students s ON cl.student_id = s.id
        WHERE cl.id = ?
      `;
      const results = executeQuery(query, [id]);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching contact log:', error);
      throw error;
    }
  }

  /**
   * Filter contact logs
   */
  static async filter(filters = {}) {
    try {
      let query = `
        SELECT cl.id, cl.student_id, cl.contact_date, cl.contact_person_name,
               cl.contact_category, cl.purpose_of_contact, cl.created_at, cl.updated_at,
               s.student_name
        FROM contact_logs cl
        LEFT JOIN students s ON cl.student_id = s.id
        WHERE 1=1
      `;
      const params = [];

      if (filters.student_id) {
        query += ` AND cl.student_id = ?`;
        params.push(filters.student_id);
      }

      if (filters.contact_date) {
        query += ` AND cl.contact_date = ?`;
        params.push(filters.contact_date);
      }

      if (filters.contact_category) {
        query += ` AND cl.contact_category = ?`;
        params.push(filters.contact_category);
      }

      if (filters.contact_person_name) {
        query += ` AND cl.contact_person_name LIKE ?`;
        params.push(`%${filters.contact_person_name}%`);
      }

      if (filters.start_date && filters.end_date) {
        query += ` AND cl.contact_date BETWEEN ? AND ?`;
        params.push(filters.start_date, filters.end_date);
      }

      query += ` ORDER BY cl.contact_date DESC, s.student_name ASC`;

      return executeQuery(query, params);
    } catch (error) {
      console.error('Error filtering contact logs:', error);
      throw error;
    }
  }

  /**
   * Create new contact log
   */
  static async create(data) {
    try {
      const query = `
        INSERT INTO contact_logs (student_id, contact_date, contact_person_name, contact_category, purpose_of_contact)
        VALUES (?, ?, ?, ?, ?)
      `;
      const result = executeQuery(query, [
        data.student_id,
        data.contact_date,
        data.contact_person_name,
        data.contact_category,
        data.purpose_of_contact
      ]);
      
      return this.get(result.lastInsertRowid);
    } catch (error) {
      console.error('Error creating contact log:', error);
      throw error;
    }
  }

  /**
   * Update contact log
   */
  static async update(id, data) {
    try {
      const query = `
        UPDATE contact_logs 
        SET student_id = ?, contact_date = ?, contact_person_name = ?, 
            contact_category = ?, purpose_of_contact = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = executeQuery(query, [
        data.student_id,
        data.contact_date,
        data.contact_person_name,
        data.contact_category,
        data.purpose_of_contact,
        id
      ]);
      
      if (result.changes === 0) {
        throw new Error('Contact log not found');
      }
      
      return this.get(id);
    } catch (error) {
      console.error('Error updating contact log:', error);
      throw error;
    }
  }

  /**
   * Delete contact log
   */
  static async delete(id) {
    try {
      const query = `DELETE FROM contact_logs WHERE id = ?`;
      const result = executeQuery(query, [id]);
      
      if (result.changes === 0) {
        throw new Error('Contact log not found');
      }
      
      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Error deleting contact log:', error);
      throw error;
    }
  }

  /**
   * Get contact logs by student
   */
  static async getByStudent(studentId) {
    try {
      const query = `
        SELECT cl.id, cl.student_id, cl.contact_date, cl.contact_person_name,
               cl.contact_category, cl.purpose_of_contact, cl.created_at, cl.updated_at,
               s.student_name
        FROM contact_logs cl
        LEFT JOIN students s ON cl.student_id = s.id
        WHERE cl.student_id = ?
        ORDER BY cl.contact_date DESC
      `;
      return executeQuery(query, [studentId]);
    } catch (error) {
      console.error('Error fetching contact logs by student:', error);
      throw error;
    }
  }

  /**
   * Get contact logs by date range
   */
  static async getByDateRange(startDate, endDate, studentId = null) {
    try {
      let query = `
        SELECT cl.id, cl.student_id, cl.contact_date, cl.contact_person_name,
               cl.contact_category, cl.purpose_of_contact, cl.created_at, cl.updated_at,
               s.student_name
        FROM contact_logs cl
        LEFT JOIN students s ON cl.student_id = s.id
        WHERE cl.contact_date BETWEEN ? AND ?
      `;
      const params = [startDate, endDate];

      if (studentId) {
        query += ` AND cl.student_id = ?`;
        params.push(studentId);
      }

      query += ` ORDER BY cl.contact_date DESC, s.student_name ASC`;

      return executeQuery(query, params);
    } catch (error) {
      console.error('Error fetching contact logs by date range:', error);
      throw error;
    }
  }

  /**
   * Get contact statistics
   */
  static async getStatistics(startDate = null, endDate = null) {
    try {
      let query = `
        SELECT 
          contact_category,
          COUNT(*) as count,
          COUNT(DISTINCT student_id) as unique_students
        FROM contact_logs
      `;
      const params = [];

      if (startDate && endDate) {
        query += ` WHERE contact_date BETWEEN ? AND ?`;
        params.push(startDate, endDate);
      }

      query += ` GROUP BY contact_category ORDER BY count DESC`;

      return executeQuery(query, params);
    } catch (error) {
      console.error('Error fetching contact log statistics:', error);
      throw error;
    }
  }
}