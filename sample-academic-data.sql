-- Sample Academic Progress Data
-- This script inserts sample data for testing the academic progress dashboard
-- Run this AFTER running the academic-progress-schema.sql

-- First, ensure we have some students (if not already present)
INSERT INTO students (student_name, grade_level, teacher_name, active) VALUES
('John Smith', '11th Grade', 'Ms. Johnson', true),
('Sarah Davis', '12th Grade', 'Mr. Wilson', true),
('Michael Brown', '10th Grade', 'Ms. Rodriguez', true),
('Emily Wilson', '11th Grade', 'Ms. Johnson', true),
('David Martinez', '12th Grade', 'Mr. Thompson', true)
ON CONFLICT DO NOTHING;

-- Sample Credits Earned data
INSERT INTO credits_earned (student_id, course_name, credit_value, date_earned, grade, semester, academic_year, course_type) VALUES
-- John Smith (assuming student_id = 1)
(1, 'English 9', 1.0, '2023-06-15', 'B+', 'Spring 2023', '2022-2023', 'core'),
(1, 'Algebra I', 1.0, '2023-06-15', 'A-', 'Spring 2023', '2022-2023', 'core'),
(1, 'Biology', 1.0, '2023-06-15', 'B', 'Spring 2023', '2022-2023', 'core'),
(1, 'World History', 1.0, '2023-06-15', 'A', 'Spring 2023', '2022-2023', 'core'),
(1, 'Physical Education', 0.5, '2023-06-15', 'A', 'Spring 2023', '2022-2023', 'elective'),
(1, 'English 10', 1.0, '2024-01-20', 'B', 'Fall 2023', '2023-2024', 'core'),
(1, 'Geometry', 1.0, '2024-01-20', 'B+', 'Fall 2023', '2023-2024', 'core'),
(1, 'Chemistry', 1.0, '2024-01-20', 'C+', 'Fall 2023', '2023-2024', 'core'),

-- Sarah Davis (assuming student_id = 2)
(2, 'English 9', 1.0, '2022-06-15', 'A', 'Spring 2022', '2021-2022', 'core'),
(2, 'Algebra I', 1.0, '2022-06-15', 'A', 'Spring 2022', '2021-2022', 'core'),
(2, 'Biology', 1.0, '2022-06-15', 'A-', 'Spring 2022', '2021-2022', 'core'),
(2, 'World History', 1.0, '2022-06-15', 'A+', 'Spring 2022', '2021-2022', 'core'),
(2, 'Spanish I', 1.0, '2022-06-15', 'B+', 'Spring 2022', '2021-2022', 'elective'),
(2, 'English 10', 1.0, '2023-01-20', 'A-', 'Fall 2022', '2022-2023', 'core'),
(2, 'Geometry', 1.0, '2023-01-20', 'A', 'Fall 2022', '2022-2023', 'core'),
(2, 'Chemistry', 1.0, '2023-01-20', 'B+', 'Fall 2022', '2022-2023', 'core'),
(2, 'US History', 1.0, '2023-06-15', 'A', 'Spring 2023', '2022-2023', 'core'),
(2, 'English 11', 1.0, '2024-01-20', 'A-', 'Fall 2023', '2023-2024', 'core'),
(2, 'Algebra II', 1.0, '2024-01-20', 'B+', 'Fall 2023', '2023-2024', 'core'),
(2, 'Physics', 1.0, '2024-01-20', 'A', 'Fall 2023', '2023-2024', 'core'),

-- Michael Brown (assuming student_id = 3)
(3, 'English 9', 1.0, '2024-01-20', 'C+', 'Fall 2023', '2023-2024', 'core'),
(3, 'Pre-Algebra', 1.0, '2024-01-20', 'B-', 'Fall 2023', '2023-2024', 'remedial'),
(3, 'Earth Science', 1.0, '2024-01-20', 'B', 'Fall 2023', '2023-2024', 'core'),
(3, 'Geography', 1.0, '2024-01-20', 'B+', 'Fall 2023', '2023-2024', 'core');

-- Sample Classes Needed data
INSERT INTO classes_needed (student_id, course_name, credit_value, priority_level, subject_area, graduation_requirement, target_completion_date, status) VALUES
-- John Smith needs
(1, 'English 11', 1.0, 'high', 'english', true, '2025-06-15', 'needed'),
(1, 'English 12', 1.0, 'high', 'english', true, '2026-06-15', 'needed'),
(1, 'Algebra II', 1.0, 'high', 'math', true, '2025-01-20', 'needed'),
(1, 'Pre-Calculus', 1.0, 'medium', 'math', true, '2025-06-15', 'needed'),
(1, 'Physics', 1.0, 'high', 'science', true, '2025-06-15', 'needed'),
(1, 'US History', 1.0, 'high', 'social_studies', true, '2025-01-20', 'needed'),
(1, 'Government', 0.5, 'medium', 'social_studies', true, '2026-01-20', 'needed'),
(1, 'Economics', 0.5, 'medium', 'social_studies', true, '2026-01-20', 'needed'),
(1, 'Art Elective', 1.0, 'low', 'arts', false, '2025-06-15', 'needed'),

-- Sarah Davis needs (senior year)
(2, 'English 12', 1.0, 'high', 'english', true, '2024-06-15', 'in_progress'),
(2, 'Pre-Calculus', 1.0, 'high', 'math', true, '2024-06-15', 'in_progress'),
(2, 'Government', 0.5, 'high', 'social_studies', true, '2024-01-20', 'needed'),
(2, 'Economics', 0.5, 'high', 'social_studies', true, '2024-06-15', 'needed'),
(2, 'Health', 0.5, 'medium', 'health', true, '2024-06-15', 'needed'),

-- Michael Brown needs (sophomore)
(3, 'English 10', 1.0, 'high', 'english', true, '2024-06-15', 'in_progress'),
(3, 'Algebra I', 1.0, 'high', 'math', true, '2024-06-15', 'in_progress'),
(3, 'Biology', 1.0, 'high', 'science', true, '2025-01-20', 'needed'),
(3, 'World History', 1.0, 'high', 'social_studies', true, '2025-01-20', 'needed'),
(3, 'Physical Education', 1.0, 'medium', 'pe', true, '2024-06-15', 'needed');

-- Sample Steps Completed data (recent progress)
INSERT INTO steps_completed (student_id, date_completed, steps_count, step_type, description) VALUES
-- Recent steps for John Smith
(1, CURRENT_DATE - INTERVAL '1 day', 3, 'academic', 'Completed math homework, studied for chemistry test, read English assignment'),
(1, CURRENT_DATE - INTERVAL '2 days', 2, 'academic', 'Attended tutoring session, completed lab report'),
(1, CURRENT_DATE - INTERVAL '3 days', 4, 'academic', 'Finished history project, studied vocabulary, completed practice problems'),
(1, CURRENT_DATE - INTERVAL '7 days', 2, 'behavioral', 'Participated in class discussion, helped classmate'),
(1, CURRENT_DATE - INTERVAL '10 days', 3, 'academic', 'Completed weekly assignments, studied for quiz'),

-- Recent steps for Sarah Davis
(2, CURRENT_DATE - INTERVAL '1 day', 5, 'academic', 'College application work, senior project progress, studied for finals'),
(2, CURRENT_DATE - INTERVAL '2 days', 4, 'academic', 'Completed scholarship applications, studied calculus'),
(2, CURRENT_DATE - INTERVAL '5 days', 3, 'academic', 'Finished English essay, physics lab, government project'),
(2, CURRENT_DATE - INTERVAL '8 days', 2, 'social', 'Peer tutoring, study group leadership'),

-- Recent steps for Michael Brown
(3, CURRENT_DATE - INTERVAL '1 day', 1, 'academic', 'Completed makeup assignment'),
(3, CURRENT_DATE - INTERVAL '3 days', 2, 'academic', 'Attended extra help session, completed homework'),
(3, CURRENT_DATE - INTERVAL '5 days', 1, 'behavioral', 'Improved attendance, participated in class');

-- Sample Current Grades data
INSERT INTO grades (student_id, course_name, grade_value, letter_grade, grade_type, semester, academic_year) VALUES
-- John Smith current grades
(1, 'English 11', 82.5, 'B-', 'current', 'Spring 2024', '2023-2024'),
(1, 'Algebra II', 88.0, 'B+', 'current', 'Spring 2024', '2023-2024'),
(1, 'Physics', 79.0, 'C+', 'current', 'Spring 2024', '2023-2024'),
(1, 'US History', 91.5, 'A-', 'current', 'Spring 2024', '2023-2024'),
(1, 'Art I', 95.0, 'A', 'current', 'Spring 2024', '2023-2024'),

-- Sarah Davis current grades
(2, 'English 12', 94.0, 'A', 'current', 'Spring 2024', '2023-2024'),
(2, 'Pre-Calculus', 87.5, 'B+', 'current', 'Spring 2024', '2023-2024'),
(2, 'Government', 92.0, 'A-', 'current', 'Spring 2024', '2023-2024'),
(2, 'Economics', 89.0, 'B+', 'current', 'Spring 2024', '2023-2024'),
(2, 'Health', 96.0, 'A', 'current', 'Spring 2024', '2023-2024'),

-- Michael Brown current grades
(3, 'English 10', 75.0, 'C', 'current', 'Spring 2024', '2023-2024'),
(3, 'Algebra I', 78.5, 'C+', 'current', 'Spring 2024', '2023-2024'),
(3, 'Biology', 81.0, 'B-', 'current', 'Spring 2024', '2023-2024'),
(3, 'World History', 83.5, 'B', 'current', 'Spring 2024', '2023-2024'),
(3, 'Physical Education', 92.0, 'A-', 'current', 'Spring 2024', '2023-2024');

-- Sample Academic Goals data
INSERT INTO academic_goals (student_id, goal_title, goal_description, target_date, status, progress_percentage, category) VALUES
-- John Smith goals
(1, 'Improve Math Grade', 'Raise Algebra II grade from B+ to A- by end of semester', '2024-06-15', 'active', 60, 'academic'),
(1, 'Complete Physics Lab Reports', 'Submit all remaining lab reports on time', '2024-05-30', 'active', 75, 'academic'),
(1, 'Prepare for SAT', 'Complete SAT prep course and practice tests', '2024-10-15', 'active', 30, 'academic'),

-- Sarah Davis goals
(2, 'Maintain GPA for College', 'Keep GPA above 3.7 for college applications', '2024-06-15', 'active', 85, 'academic'),
(2, 'Complete Senior Project', 'Finish capstone project on environmental science', '2024-05-15', 'active', 90, 'academic'),
(2, 'College Preparation', 'Complete all college application requirements', '2024-04-01', 'completed', 100, 'academic'),

-- Michael Brown goals
(3, 'Pass All Classes', 'Achieve passing grades in all current courses', '2024-06-15', 'active', 70, 'academic'),
(3, 'Improve Attendance', 'Maintain 90% attendance rate', '2024-06-15', 'active', 80, 'behavioral'),
(3, 'Math Skills Improvement', 'Master basic algebra concepts', '2024-08-15', 'active', 45, 'academic');

-- Sample Academic Progress Snapshots (monthly snapshots)
INSERT INTO academic_progress_snapshots (student_id, snapshot_date, total_credits_earned, total_credits_needed, gpa, attendance_rate, behavioral_score, on_track_for_graduation, notes) VALUES
-- John Smith snapshots
(1, '2024-01-15', 7.5, 16.5, 3.2, 92.5, 85.0, true, 'Good progress, needs to focus on math and science'),
(1, '2024-02-15', 7.5, 16.5, 3.3, 94.0, 87.5, true, 'Improvement in grades, attendance excellent'),
(1, '2024-03-15', 7.5, 16.5, 3.25, 91.0, 82.0, true, 'Slight dip in performance, extra support provided'),

-- Sarah Davis snapshots
(2, '2024-01-15', 19.0, 3.0, 3.8, 96.5, 95.0, true, 'Excellent student, on track for graduation'),
(2, '2024-02-15', 19.0, 3.0, 3.85, 97.0, 96.0, true, 'Outstanding performance, college ready'),
(2, '2024-03-15', 19.0, 3.0, 3.9, 98.0, 97.0, true, 'Exceptional student, leadership qualities'),

-- Michael Brown snapshots
(3, '2024-01-15', 4.0, 20.0, 2.1, 78.5, 65.0, false, 'Struggling student, needs intensive support'),
(3, '2024-02-15', 4.0, 20.0, 2.3, 82.0, 70.0, false, 'Showing improvement with additional support'),
(3, '2024-03-15', 4.0, 20.0, 2.4, 85.5, 75.0, false, 'Continued progress, building confidence');

-- Test the dashboard view
-- SELECT * FROM academic_progress_dashboard;