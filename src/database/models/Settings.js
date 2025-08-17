import { executeQuery } from '../connection.js';

export class Settings {
  /**
   * Get all settings (usually just one record)
   */
  static async list() {
    try {
      const query = `
        SELECT id, teacher_name, school_name, academic_year, grading_scale,
               notification_preferences, created_at, updated_at
        FROM settings
        ORDER BY id ASC
      `;
      const results = executeQuery(query);
      
      // Parse JSON fields
      return results.map(row => ({
        ...row,
        grading_scale: row.grading_scale ? JSON.parse(row.grading_scale) : null,
        notification_preferences: row.notification_preferences ? JSON.parse(row.notification_preferences) : null
      }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  /**
   * Get settings by ID
   */
  static async get(id) {
    try {
      const query = `
        SELECT id, teacher_name, school_name, academic_year, grading_scale,
               notification_preferences, created_at, updated_at
        FROM settings
        WHERE id = ?
      `;
      const results = executeQuery(query, [id]);
      const row = results[0];
      
      if (!row) return null;
      
      return {
        ...row,
        grading_scale: row.grading_scale ? JSON.parse(row.grading_scale) : null,
        notification_preferences: row.notification_preferences ? JSON.parse(row.notification_preferences) : null
      };
    } catch (error) {
      console.error('Error fetching settings:', error);
      throw error;
    }
  }

  /**
   * Get current settings (first record)
   */
  static async getCurrent() {
    try {
      const settings = await this.list();
      return settings[0] || null;
    } catch (error) {
      console.error('Error fetching current settings:', error);
      throw error;
    }
  }

  /**
   * Create new settings
   */
  static async create(data) {
    try {
      const query = `
        INSERT INTO settings (teacher_name, school_name, academic_year, grading_scale, notification_preferences)
        VALUES (?, ?, ?, ?, ?)
      `;
      const result = executeQuery(query, [
        data.teacher_name || null,
        data.school_name || null,
        data.academic_year || null,
        JSON.stringify(data.grading_scale || {}),
        JSON.stringify(data.notification_preferences || {})
      ]);
      
      return this.get(result.lastInsertRowid);
    } catch (error) {
      console.error('Error creating settings:', error);
      throw error;
    }
  }

  /**
   * Update settings
   */
  static async update(id, data) {
    try {
      const query = `
        UPDATE settings 
        SET teacher_name = ?, school_name = ?, academic_year = ?, 
            grading_scale = ?, notification_preferences = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `;
      const result = executeQuery(query, [
        data.teacher_name || null,
        data.school_name || null,
        data.academic_year || null,
        JSON.stringify(data.grading_scale || {}),
        JSON.stringify(data.notification_preferences || {}),
        id
      ]);
      
      if (result.changes === 0) {
        throw new Error('Settings not found');
      }
      
      return this.get(id);
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  }

  /**
   * Update current settings (first record)
   */
  static async updateCurrent(data) {
    try {
      const current = await this.getCurrent();
      
      if (current) {
        return this.update(current.id, data);
      } else {
        return this.create(data);
      }
    } catch (error) {
      console.error('Error updating current settings:', error);
      throw error;
    }
  }

  /**
   * Delete settings
   */
  static async delete(id) {
    try {
      const query = `DELETE FROM settings WHERE id = ?`;
      const result = executeQuery(query, [id]);
      
      if (result.changes === 0) {
        throw new Error('Settings not found');
      }
      
      return { success: true, deletedId: id };
    } catch (error) {
      console.error('Error deleting settings:', error);
      throw error;
    }
  }

  /**
   * Reset settings to defaults
   */
  static async resetToDefaults() {
    try {
      const defaultSettings = {
        teacher_name: 'Teacher Name',
        school_name: 'School Name',
        academic_year: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
        grading_scale: {
          excellent: 4,
          good: 3,
          satisfactory: 2,
          needs_improvement: 1
        },
        notification_preferences: {
          email_notifications: true,
          daily_summaries: true,
          incident_alerts: true,
          weekly_reports: false
        }
      };

      const current = await this.getCurrent();
      
      if (current) {
        return this.update(current.id, defaultSettings);
      } else {
        return this.create(defaultSettings);
      }
    } catch (error) {
      console.error('Error resetting settings to defaults:', error);
      throw error;
    }
  }

  /**
   * Get grading scale
   */
  static async getGradingScale() {
    try {
      const settings = await this.getCurrent();
      return settings?.grading_scale || {
        excellent: 4,
        good: 3,
        satisfactory: 2,
        needs_improvement: 1
      };
    } catch (error) {
      console.error('Error fetching grading scale:', error);
      throw error;
    }
  }

  /**
   * Update grading scale
   */
  static async updateGradingScale(gradingScale) {
    try {
      const current = await this.getCurrent();
      
      if (current) {
        return this.update(current.id, {
          ...current,
          grading_scale: gradingScale
        });
      } else {
        return this.create({ grading_scale: gradingScale });
      }
    } catch (error) {
      console.error('Error updating grading scale:', error);
      throw error;
    }
  }
}