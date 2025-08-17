// SQLite API Client - Connects to local Express server with SQLite database

const API_BASE_URL = 'http://localhost:3001/api';

class SQLiteClient {
  constructor(endpoint) {
    this.endpoint = endpoint;
  }

  async request(path, options = {}) {
    const url = `${API_BASE_URL}${path}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${path}`, error);
      throw error;
    }
  }

  // Generic CRUD operations
  async list() {
    return await this.request(this.endpoint);
  }

  async get(id) {
    return await this.request(`${this.endpoint}/${id}`);
  }

  async create(data) {
    return await this.request(this.endpoint, {
      method: 'POST',
      body: data,
    });
  }

  async update(id, data) {
    return await this.request(`${this.endpoint}/${id}`, {
      method: 'PUT',
      body: data,
    });
  }

  async delete(id) {
    return await this.request(`${this.endpoint}/${id}`, {
      method: 'DELETE',
    });
  }

  // Save method (create or update)
  async save(data) {
    if (data.id) {
      return await this.update(data.id, data);
    } else {
      return await this.create(data);
    }
  }

  // Filter method (for compatibility with existing code)
  async filter(criteria) {
    // For now, get all and filter client-side
    // TODO: Implement server-side filtering
    const all = await this.list();
    return all.filter(item => {
      return Object.entries(criteria).every(([key, value]) => {
        // Handle boolean values properly (SQLite returns 1/0 for boolean)
        if (typeof value === 'boolean') {
          return Boolean(item[key]) === value;
        }
        return item[key] === value;
      });
    });
  }

  // Save all method (for compatibility)
  async saveAll(dataArray) {
    const results = [];
    for (const data of dataArray) {
      const result = await this.save(data);
      results.push(result);
    }
    return results;
  }
}

// Specialized clients for different endpoints
class StudentClient extends SQLiteClient {
  constructor() {
    super('/students');
  }

  async search(searchTerm) {
    return await this.request(`${this.endpoint}/search?q=${encodeURIComponent(searchTerm)}`);
  }

  async getByTeacher(teacherName) {
    return await this.request(`${this.endpoint}/teacher/${encodeURIComponent(teacherName)}`);
  }

  async getByGrade(gradeLevel) {
    return await this.request(`${this.endpoint}/grade/${encodeURIComponent(gradeLevel)}`);
  }
}

class DailyEvaluationClient extends SQLiteClient {
  constructor() {
    super('/evaluations');
  }

  async getByStudent(studentId) {
    return await this.request(`${this.endpoint}/student/${studentId}`);
  }
}

class ContactLogClient extends SQLiteClient {
  constructor() {
    super('/contact-logs');
  }
}

class IncidentReportClient extends SQLiteClient {
  constructor() {
    super('/incident-reports');
  }
}

class SettingsClient extends SQLiteClient {
  constructor() {
    super('/settings');
  }
}

// Export client instances
export const Student = new StudentClient();
export const DailyEvaluation = new DailyEvaluationClient();
export const ContactLog = new ContactLogClient();
export const IncidentReport = new IncidentReportClient();
export const Settings = new SettingsClient();

// Mock behavior summary and user for compatibility
export const BehaviorSummary = new SQLiteClient('/behavior-summaries');
export const User = {
  getCurrentUser: async () => ({
    id: 'sqlite-user',
    email: 'user@brighttrack.local',
    name: 'SQLite User'
  }),
  signIn: async () => true,
  signOut: async () => true,
  isAuthenticated: () => true
};

// Check if SQLite server is available
export const isSQLiteAvailable = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/students`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

export const getStorageType = () => 'sqlite';
