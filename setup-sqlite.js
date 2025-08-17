import { Student } from './src/database/models/index.js';

console.log('🗄️  Setting up SQLite database with real student data...');

// Real student names provided by user
const realStudents = [
  { student_name: 'Chance', grade_level: '3rd Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Elijah', grade_level: '4th Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Eloy', grade_level: '2nd Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Emiliano (Nano)', grade_level: '5th Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Curtis', grade_level: '1st Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Jason', grade_level: '3rd Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Paytin', grade_level: '2nd Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Jaden', grade_level: '4th Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'David', grade_level: '5th Grade', teacher_name: 'Ms. Johnson' },
  { student_name: 'Theodore (TJ)', grade_level: '1st Grade', teacher_name: 'Ms. Johnson' }
];

async function setupDatabase() {
  try {
    // Check if students already exist
    const existingStudents = await Student.list();
    
    if (existingStudents.length > 0) {
      console.log(`📊 Database already has ${existingStudents.length} students. Skipping setup.`);
      console.log('💡 To reset the database, delete bright-track.db and run this script again.');
      return;
    }

    // Add real students
    console.log('👥 Adding real students to database...');
    for (const studentData of realStudents) {
      const student = await Student.create(studentData);
      console.log(`✅ Added: ${student.student_name} (${student.grade_level})`);
    }

    console.log(`\n🎉 Successfully set up SQLite database with ${realStudents.length} students!`);
    console.log('\n📋 Students added:');
    realStudents.forEach((student, index) => {
      console.log(`   ${index + 1}. ${student.student_name} - ${student.grade_level}`);
    });

    console.log('\n🚀 You can now start the server with: npm run server');
    console.log('🌐 Or run both server and client with: npm run dev:full');

  } catch (error) {
    console.error('❌ Error setting up database:', error);
    process.exit(1);
  }
}

setupDatabase();
