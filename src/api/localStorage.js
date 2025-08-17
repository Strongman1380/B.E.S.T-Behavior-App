// Local Storage API - Replaces Base44 SDK with localStorage
class LocalStorageEntity {
  constructor(entityName) {
    this.entityName = entityName;
    this.storageKey = `brighttrack_${entityName}`;
  }

  // Generate a simple ID
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9);
  }

  // Get all records from localStorage
  getAll() {
    const data = localStorage.getItem(this.storageKey);
    return data ? JSON.parse(data) : [];
  }

  // Save all records to localStorage
  saveAll(records) {
    localStorage.setItem(this.storageKey, JSON.stringify(records));
  }

  // Create a new record
  create(data) {
    const records = this.getAll();
    const newRecord = {
      id: data.id || this.generateId(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...data
    };
    records.push(newRecord);
    this.saveAll(records);
    return newRecord;
  }

  // Save a record (create or update)
  save(data) {
    if (data.id) {
      return this.update(data.id, data);
    } else {
      return this.create(data);
    }
  }

  // Get a single record by ID
  get(id) {
    const records = this.getAll();
    const record = records.find(r => r.id === id);
    return record || null;
  }

  // Update a record
  update(id, data) {
    const records = this.getAll();
    const index = records.findIndex(r => r.id === id);
    if (index === -1) {
      // If record doesn't exist, create it
      return this.create({ id, ...data });
    }
    records[index] = {
      ...records[index],
      ...data,
      id,
      updated_at: new Date().toISOString()
    };
    this.saveAll(records);
    return records[index];
  }

  // Delete a record
  delete(id) {
    const records = this.getAll();
    const filteredRecords = records.filter(r => r.id !== id);
    if (records.length === filteredRecords.length) {
      return false; // Record not found
    }
    this.saveAll(filteredRecords);
    return true;
  }

  // List all records with optional sorting
  list(sortBy = 'created_at') {
    let records = this.getAll();
    if (sortBy) {
      records.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (aVal < bVal) return sortBy === 'created_at' ? 1 : -1; // Reverse for created_at
        if (aVal > bVal) return sortBy === 'created_at' ? -1 : 1;
        return 0;
      });
    }
    return records;
  }

  // Filter records based on criteria
  filter(criteria = {}, sortBy = null) {
    let records = this.getAll();
    
    // Apply filters
    Object.keys(criteria).forEach(key => {
      const value = criteria[key];
      records = records.filter(record => {
        if (record[key] === undefined) return false;
        return record[key] === value;
      });
    });

    // Apply sorting
    if (sortBy) {
      records.sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (aVal < bVal) return sortBy === 'created_at' ? 1 : -1;
        if (aVal > bVal) return sortBy === 'created_at' ? -1 : 1;
        return 0;
      });
    }

    return records;
  }
}

// Initialize entities
export const Student = new LocalStorageEntity('students');
export const DailyEvaluation = new LocalStorageEntity('daily_evaluations');
export const Settings = new LocalStorageEntity('settings');
export const ContactLog = new LocalStorageEntity('contact_logs');
export const BehaviorSummary = new LocalStorageEntity('behavior_summaries');
export const IncidentReport = new LocalStorageEntity('incident_reports');

// Mock auth object
export const User = {
  getCurrentUser: async () => ({
    id: 'local-user',
    email: 'demo@brighttrack.local',
    name: 'Demo User'
  }),
  signIn: async () => true,
  signOut: async () => true,
  isAuthenticated: () => true
};

// Initialize with sample data if none exists
export const initializeSampleData = () => {
  // Check if we already have data
  if (Student.getAll().length > 0) {
    return; // Data already exists
  }

  // Create sample students
  const sampleStudents = [
    {
      id: 'student-1',
      student_name: 'Chance',
      grade: '3rd Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-2', 
      student_name: 'Elijah',
      grade: '4th Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-3',
      student_name: 'Eloy',
      grade: '2nd Grade', 
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-4',
      student_name: 'Emiliano (Nano)',
      grade: '5th Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-5',
      student_name: 'Curtis',
      grade: '1st Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-6',
      student_name: 'Jason',
      grade: '3rd Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-7',
      student_name: 'Paytin',
      grade: '2nd Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-8',
      student_name: 'Jaden',
      grade: '4th Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-9',
      student_name: 'David',
      grade: '5th Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'student-10',
      student_name: 'Theodore (TJ)',
      grade: '1st Grade',
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Create default settings
  const defaultSettings = {
    id: 'settings-1',
    school_name: 'Bright Track Elementary',
    rating_scale: 5,
    time_slots: [
      '8:00-9:00 AM',
      '9:00-10:00 AM', 
      '10:00-11:00 AM',
      '11:00-12:00 PM',
      '12:00-1:00 PM',
      '1:00-2:00 PM',
      '2:00-3:00 PM',
      '3:00-4:00 PM',
      '4:00-5:00 PM'
    ],
    behavior_categories: [
      'Following Directions',
      'Staying on Task',
      'Appropriate Social Interaction',
      'Classroom Participation',
      'Self-Control'
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  // Create sample behavior summaries
  const sampleSummaries = [
    {
      id: 'summary-1',
      student_id: 'student-1',
      date_range_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 week ago
      date_range_end: new Date().toISOString().split('T')[0], // today
      prepared_by: 'Ms. Johnson',
      general_behavior_overview: 'Emma has shown consistent positive behavior throughout the week. She follows classroom rules and participates actively in group activities.',
      strengths: 'Emma demonstrates excellent listening skills, shows respect for peers and adults, and consistently completes her work on time. She is helpful to classmates and shows leadership qualities during group projects.',
      improvements_needed: 'Emma could work on raising her hand before speaking and waiting for her turn during discussions. She sometimes gets excited and interrupts others.',
      behavioral_incidents: 'No significant behavioral incidents this week. One minor reminder about indoor voice during library time.',
      summary_recommendations: 'Continue to encourage Emma\'s positive leadership qualities. Implement a visual reminder system for hand-raising. Consider giving her additional responsibilities to channel her enthusiasm positively.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'summary-2',
      student_id: 'student-2',
      date_range_start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      date_range_end: new Date().toISOString().split('T')[0],
      prepared_by: 'Ms. Johnson',
      general_behavior_overview: 'Marcus has had a challenging week with some behavioral concerns that need attention. He has shown improvement in the latter part of the week.',
      strengths: 'Marcus is creative and shows strong problem-solving skills. When engaged, he demonstrates good understanding of academic concepts. He has shown kindness to younger students during recess.',
      improvements_needed: 'Marcus needs to work on following directions the first time given, staying in his seat during instruction time, and using appropriate language when frustrated.',
      behavioral_incidents: 'Tuesday: Refused to complete math assignment and used inappropriate language. Thursday: Left seat multiple times during reading instruction. Friday: Showed improvement with only one redirection needed.',
      summary_recommendations: 'Implement a behavior chart with clear expectations. Provide frequent breaks and movement opportunities. Consider a check-in system with school counselor. Praise positive behaviors immediately when observed.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Create sample incident reports
  const sampleIncidents = [
    {
      id: 'incident-1',
      student_id: 'student-2',
      student_name: 'Marcus Williams',
      incident_date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
      incident_time: '10:30 AM',
      incident_type: 'Disruptive Behavior',
      incident_summary: 'Marcus was repeatedly talking out of turn during math instruction and making noises to distract other students.',
      staff_name: 'Ms. Johnson',
      location: 'Classroom 3B',
      witnesses: 'Teaching Assistant Sarah',
      antecedent: 'Math lesson on fractions - Marcus appeared frustrated with the material',
      behavior_description: 'Talking out of turn, making clicking noises with pencil, turning around to talk to peers',
      consequence: 'Verbal redirection, moved to quiet work area, loss of 5 minutes recess',
      follow_up_actions: 'Parent contact scheduled, behavior chart implemented',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'incident-2',
      student_id: 'student-3',
      student_name: 'Sofia Rodriguez',
      incident_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 5 days ago
      incident_time: '1:15 PM',
      incident_type: 'Refusing Redirection',
      incident_summary: 'Sofia refused to transition from lunch to classroom and hid under the lunch table.',
      staff_name: 'Ms. Johnson',
      location: 'Cafeteria',
      witnesses: 'Lunch Monitor Mrs. Smith',
      antecedent: 'End of lunch period, transition time to classroom',
      behavior_description: 'Refused to line up, crawled under table, said "I don\'t want to go"',
      consequence: 'Calm discussion, allowed extra 2 minutes, walked with teacher',
      follow_up_actions: 'Discussed transition strategies, created visual schedule',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'incident-3',
      student_id: 'student-4',
      student_name: 'Aiden Chen',
      incident_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago
      incident_time: '2:00 PM',
      incident_type: 'Aggressive Behavior',
      incident_summary: 'Aiden pushed another student during recess after a disagreement about game rules.',
      staff_name: 'Mr. Davis',
      location: 'Playground',
      witnesses: 'Recess Monitor Ms. Garcia',
      antecedent: 'Disagreement about kickball rules with peer',
      behavior_description: 'Raised voice, pushed peer with both hands, walked away angrily',
      consequence: 'Immediate removal from playground, discussion about appropriate conflict resolution',
      follow_up_actions: 'Apology to peer, practice conflict resolution strategies, parent notification',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Create sample daily evaluations with varied data
  const sampleEvaluations = [
    {
      id: 'eval-1',
      student_id: 'student-1',
      date: new Date().toISOString().split('T')[0], // today
      teacher_name: 'Ms. Johnson',
      school: 'Bright Track Elementary',
      time_slots: {
        '8:30': { rating: 4, has_smiley: true, comment: 'Great start to the day!' },
        '9:10': { rating: 4, has_smiley: true, comment: 'Excellent participation in reading' },
        '9:50': { rating: 3, has_smiley: false, comment: 'Good focus during math' },
        '10:30': { rating: 4, has_smiley: true, comment: 'Helpful during group work' },
        '11:10': { rating: 4, has_smiley: true, comment: 'Great listening skills' },
        '1:10': { rating: 3, has_smiley: false, comment: 'Needed one reminder to stay on task' },
        '1:50': { rating: 4, has_smiley: true, comment: 'Excellent science participation' },
        '2:30': { status: 'PRESENT', comment: 'Good day overall' }
      },
      general_comments: 'Emma had an excellent day with consistent positive behavior.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'eval-2',
      student_id: 'student-2',
      date: new Date().toISOString().split('T')[0], // today
      teacher_name: 'Ms. Johnson',
      school: 'Bright Track Elementary',
      time_slots: {
        '8:30': { rating: 2, has_smiley: false, comment: 'Difficulty settling in' },
        '9:10': { rating: 3, has_smiley: false, comment: 'Better focus after redirection' },
        '9:50': { rating: 2, has_smiley: false, comment: 'Struggled with math concepts' },
        '10:30': { rating: 1, has_smiley: false, comment: 'Disruptive during group time' },
        '11:10': { rating: 3, has_smiley: true, comment: 'Improved after break' },
        '1:10': { rating: 3, has_smiley: false, comment: 'Adequate participation' },
        '1:50': { rating: 4, has_smiley: true, comment: 'Great engagement in science' },
        '2:30': { status: 'PRESENT', comment: 'Ended day on positive note' }
      },
      general_comments: 'Marcus had some challenges today but showed improvement in the afternoon.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'eval-3',
      student_id: 'student-1',
      date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // yesterday
      teacher_name: 'Ms. Johnson',
      school: 'Bright Track Elementary',
      time_slots: {
        '8:30': { rating: 4, has_smiley: true, comment: 'Excellent morning routine' },
        '9:10': { rating: 4, has_smiley: true, comment: 'Outstanding reading performance' },
        '9:50': { rating: 4, has_smiley: true, comment: 'Helped peers with math' },
        '10:30': { rating: 3, has_smiley: false, comment: 'Good group participation' },
        '11:10': { rating: 4, has_smiley: true, comment: 'Excellent listening' },
        '1:10': { rating: 4, has_smiley: true, comment: 'Great focus after lunch' },
        '1:50': { rating: 4, has_smiley: true, comment: 'Wonderful science questions' },
        '2:30': { status: 'PRESENT', comment: 'Fantastic day!' }
      },
      general_comments: 'Emma continues to be a positive role model for her peers.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'eval-4',
      student_id: 'student-3',
      date: new Date().toISOString().split('T')[0], // today
      teacher_name: 'Ms. Johnson',
      school: 'Bright Track Elementary',
      time_slots: {
        '8:30': { rating: 3, has_smiley: true, comment: 'Good morning arrival' },
        '9:10': { rating: 4, has_smiley: true, comment: 'Excellent reading focus' },
        '9:50': { rating: 3, has_smiley: false, comment: 'Needed help with math' },
        '10:30': { rating: 4, has_smiley: true, comment: 'Great teamwork' },
        '11:10': { rating: 3, has_smiley: false, comment: 'Good listening' },
        '1:10': { rating: 2, has_smiley: false, comment: 'Tired after lunch' },
        '1:50': { rating: 3, has_smiley: true, comment: 'Engaged in science' },
        '2:30': { status: 'PRESENT', comment: 'Solid day overall' }
      },
      general_comments: 'Sofia showed good engagement today with some afternoon fatigue.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'eval-5',
      student_id: 'student-4',
      date: new Date().toISOString().split('T')[0], // today
      teacher_name: 'Ms. Johnson',
      school: 'Bright Track Elementary',
      time_slots: {
        '8:30': { rating: 4, has_smiley: true, comment: 'Enthusiastic start' },
        '9:10': { rating: 4, has_smiley: true, comment: 'Strong reading skills' },
        '9:50': { rating: 4, has_smiley: true, comment: 'Math leader today' },
        '10:30': { rating: 3, has_smiley: false, comment: 'Minor disagreement resolved' },
        '11:10': { rating: 4, has_smiley: true, comment: 'Excellent questions' },
        '1:10': { rating: 4, has_smiley: true, comment: 'Great focus after lunch' },
        '1:50': { rating: 4, has_smiley: true, comment: 'Science experiment leader' },
        '2:30': { status: 'PRESENT', comment: 'Outstanding day!' }
      },
      general_comments: 'Aiden had an excellent day showing leadership and academic strength.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    // Add some historical data for trends
    {
      id: 'eval-6',
      student_id: 'student-2',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days ago
      teacher_name: 'Ms. Johnson',
      school: 'Bright Track Elementary',
      time_slots: {
        '8:30': { rating: 1, has_smiley: false, comment: 'Difficult morning' },
        '9:10': { rating: 2, has_smiley: false, comment: 'Struggled to focus' },
        '9:50': { rating: 1, has_smiley: false, comment: 'Disruptive during math' },
        '10:30': { rating: 2, has_smiley: false, comment: 'Needed multiple redirections' },
        '11:10': { rating: 3, has_smiley: true, comment: 'Improved after break' },
        '1:10': { rating: 2, has_smiley: false, comment: 'Restless after lunch' },
        '1:50': { rating: 3, has_smiley: false, comment: 'Better engagement' },
        '2:30': { status: 'PRESENT', comment: 'Challenging day' }
      },
      general_comments: 'Marcus had a particularly challenging day requiring extra support.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'eval-7',
      student_id: 'student-1',
      date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
      teacher_name: 'Ms. Johnson',
      school: 'Bright Track Elementary',
      time_slots: {
        '8:30': { rating: 4, has_smiley: true, comment: 'Great morning energy' },
        '9:10': { rating: 4, has_smiley: true, comment: 'Reading comprehension excellent' },
        '9:50': { rating: 3, has_smiley: true, comment: 'Helped struggling peer' },
        '10:30': { rating: 4, has_smiley: true, comment: 'Natural leader' },
        '11:10': { rating: 4, has_smiley: true, comment: 'Thoughtful questions' },
        '1:10': { rating: 4, has_smiley: true, comment: 'Smooth transition' },
        '1:50': { rating: 4, has_smiley: true, comment: 'Science curiosity' },
        '2:30': { status: 'PRESENT', comment: 'Exceptional day' }
      },
      general_comments: 'Emma consistently demonstrates positive leadership and academic excellence.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ];

  // Save sample data
  Student.saveAll(sampleStudents);
  Settings.saveAll([defaultSettings]);
  BehaviorSummary.saveAll(sampleSummaries);
  IncidentReport.saveAll(sampleIncidents);
  DailyEvaluation.saveAll(sampleEvaluations);

  console.log('Sample data initialized for Bright Track with behavior summaries, incidents, and evaluations');
};
