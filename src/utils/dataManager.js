// Data Management Utilities for Bright Track
import { Student, DailyEvaluation, Settings, ContactLog, BehaviorSummary } from '@/api/entities';

export const dataManager = {
  // Export all data as JSON
  exportData: () => {
    const data = {
      students: Student.getAll(),
      evaluations: DailyEvaluation.getAll(),
      settings: Settings.getAll(),
      contactLogs: ContactLog.getAll(),
      behaviorSummaries: BehaviorSummary.getAll(),
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    return JSON.stringify(data, null, 2);
  },

  // Import data from JSON
  importData: (jsonData) => {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.students) Student.saveAll(data.students);
      if (data.evaluations) DailyEvaluation.saveAll(data.evaluations);
      if (data.settings) Settings.saveAll(data.settings);
      if (data.contactLogs) ContactLog.saveAll(data.contactLogs);
      if (data.behaviorSummaries) BehaviorSummary.saveAll(data.behaviorSummaries);
      
      return true;
    } catch (error) {
      console.error('Import failed:', error);
      return false;
    }
  },

  // Clear all data
  clearAllData: () => {
    localStorage.removeItem('brighttrack_students');
    localStorage.removeItem('brighttrack_daily_evaluations');
    localStorage.removeItem('brighttrack_settings');
    localStorage.removeItem('brighttrack_contact_logs');
    localStorage.removeItem('brighttrack_behavior_summaries');
  },

  // Reset to sample data
  resetToSampleData: () => {
    dataManager.clearAllData();
    // Reload the page to trigger sample data initialization
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  },

  // Get data statistics
  getStats: () => {
    return {
      students: Student.getAll().length,
      evaluations: DailyEvaluation.getAll().length,
      settings: Settings.getAll().length,
      contactLogs: ContactLog.getAll().length,
      behaviorSummaries: BehaviorSummary.getAll().length
    };
  }
};

// Make dataManager available globally for debugging
if (typeof window !== 'undefined') {
  window.brightTrackDataManager = dataManager;
}