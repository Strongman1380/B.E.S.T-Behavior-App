import { executeQuery } from '../connection.js';

export class Student {
  /**
   * Get all students
   */
  static async list() {
    try {
      const query = `
        SELECT id, student_name, grade_level, teacher_name, active,
               created_at, updated_at
        FROM students 
        ORDER BY student_name ASC
      `;
      return executeQuery(query);
    } catch (error) {
      console.error('Error fetching students:', error);
      throw error;
    }
  }

  /**
   * Get student by ID
   */
  static async get(id) {
    try {
      const query = `
        SELECT id, student_name, grade_level, teacher_name, active,
               created_at, updated_at
        FROM students 
        WHERE id = ?
      `;
      const results = executeQuery(query, [id]);
      return results[0] || null;
    } catch (error) {
      console.error('Error fetching student:', error);
      throw error;
    }
  }

  /**
   * Create new student
   */
  static async create(data) {
    try {
      const query = `
        INSERT INTO students (student_name, grade_level, teacher_name, active)
        VALUES (?, ?, ?, ?)
      `;
      const result = executeQuery(query, [
        data.student_name,
        data.grade_level || null,
        data.teacher_name || null,
        data.active !== undefined ? data.active : true
      ]);
      
      // Return the created student
      return this.get(result.lastInsertRowid);
    } catch (error) {
      console.error('Error creating student:', error);
      throw error;
    }
  }

  /**
   * Update student
   */
  static async update(id, data) {
    try {
      const query = `
        UPDATE students 
        SET student_name = ?, grade_level = ?, teacher_name = ?, active = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = executeQuery(query, [
        data.student_name,
        data.grade_level || null,
        data.teacher_name || null,
        data.active !== undefined ? data.active : true,
        id
      ]);
      
      if (result.changes === 0) {
        throw new Error('Student not found');
      }
      
      return this.get(id);
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  }

  /**
   * Delete student
   */
  static async delete(id) {
    try {
      const query = `DELETE FROM students WHERE id = ?`;
      const result = executeQuery(query, [id]);
      
      if (result.changes === 0) {
        throw new Error('Student not found');
      }
      
      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  }

  /**
   * Search students by name
   */
  static async search(searchTerm) {
    try {
      const query = `
        SELECT id, student_name, grade_level, teacher_name, active,
               created_at, updated_at
        FROM students 
        WHERE student_name LIKE ? OR grade_level LIKE ? OR teacher_name LIKE ?
        ORDER BY student_name ASC
      `;
      const searchPattern = `%${searchTerm}%`;
      return executeQuery(query, [searchPattern, searchPattern, searchPattern]);
    } catch (error) {
      console.error('Error searching students:', error);
      throw error;
    }
  }

  /**
   * Get students by teacher
   */
  static async getByTeacher(teacherName) {
    try {
      const query = `
        SELECT id, student_name, grade_level, teacher_name, active,
               created_at, updated_at
        FROM students 
        WHERE teacher_name = ?
        ORDER BY student_name ASC
      `;
      return executeQuery(query, [teacherName]);
    } catch (error) {
      console.error('Error fetching students by teacher:', error);
      throw error;
    }
  }

  /**
   * Get students by grade level
   */
  static async getByGrade(gradeLevel) {
    try {
      const query = `
        SELECT id, student_name, grade_level, teacher_name, active,
               created_at, updated_at
        FROM students 
        WHERE grade_level = ?
        ORDER BY student_name ASC
      `;
      return executeQuery(query, [gradeLevel]);
    } catch (error) {
      console.error('Error fetching students by grade:', error);
      throw error;
    }
  }
}