import { executeQuery } from '../postgres.js';

export class PostgresStudent {
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
      return await executeQuery(query);
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
        WHERE id = $1
      `;
      const results = await executeQuery(query, [id]);
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
        VALUES ($1, $2, $3, $4)
        RETURNING id, student_name, grade_level, teacher_name, active, created_at, updated_at
      `;
      const results = await executeQuery(query, [
        data.student_name,
        data.grade_level || null,
        data.teacher_name || null,
        data.active !== undefined ? data.active : true
      ]);
      
      return results[0];
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
        SET student_name = $1, grade_level = $2, teacher_name = $3, active = $4
        WHERE id = $5
        RETURNING id, student_name, grade_level, teacher_name, active, created_at, updated_at
      `;
      const results = await executeQuery(query, [
        data.student_name,
        data.grade_level || null,
        data.teacher_name || null,
        data.active !== undefined ? data.active : true,
        id
      ]);
      
      if (results.length === 0) {
        throw new Error('Student not found');
      }
      
      return results[0];
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
      const query = `DELETE FROM students WHERE id = $1 RETURNING id`;
      const results = await executeQuery(query, [id]);
      
      if (results.length === 0) {
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
        WHERE student_name ILIKE $1 OR grade_level ILIKE $1 OR teacher_name ILIKE $1
        ORDER BY student_name ASC
      `;
      const searchPattern = `%${searchTerm}%`;
      return await executeQuery(query, [searchPattern]);
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
        WHERE teacher_name = $1
        ORDER BY student_name ASC
      `;
      return await executeQuery(query, [teacherName]);
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
        WHERE grade_level = $1
        ORDER BY student_name ASC
      `;
      return await executeQuery(query, [gradeLevel]);
    } catch (error) {
      console.error('Error fetching students by grade:', error);
      throw error;
    }
  }

  /**
   * Filter students by criteria
   */
  static async filter(criteria) {
    try {
      let query = `
        SELECT id, student_name, grade_level, teacher_name, active,
               created_at, updated_at
        FROM students
      `;
      
      const conditions = [];
      const params = [];
      let paramCount = 0;

      Object.entries(criteria).forEach(([key, value]) => {
        paramCount++;
        if (key === 'active') {
          conditions.push(`${key} = $${paramCount}`);
          params.push(value);
        } else {
          conditions.push(`${key} = $${paramCount}`);
          params.push(value);
        }
      });

      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      query += ' ORDER BY student_name ASC';

      return await executeQuery(query, params);
    } catch (error) {
      console.error('Error filtering students:', error);
      throw error;
    }
  }

  /**
   * Save (create or update) student
   */
  static async save(data) {
    if (data.id) {
      return await this.update(data.id, data);
    } else {
      return await this.create(data);
    }
  }

  /**
   * Save multiple students
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