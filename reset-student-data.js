// Reset script to clear localStorage and load new student data
console.log('Clearing existing student data...');

// Clear all Bright Track localStorage data
const keys = [
  'brighttrack_students',
  'brighttrack_daily_evaluations', 
  'brighttrack_settings',
  'brighttrack_contact_logs',
  'brighttrack_behavior_summaries',
  'brighttrack_incident_reports'
];

keys.forEach(key => {
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
    console.log(`Cleared: ${key}`);
  }
});

console.log('All student data cleared. New student names will load on next page refresh.');
console.log('Please refresh your browser to see the updated student list.');
