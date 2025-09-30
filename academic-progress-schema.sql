-- Academic Progress Dashboard Schema
-- This script creates all tables needed for the academic progress dashboard
-- Run this in your database to enable credit tracking, grades, and progress monitoring

-- Credits Earned table - tracks completed courses and earned credits
CREATE TABLE IF NOT EXISTS credits_earned (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  credit_value NUMERIC(4, 2) NOT NULL,
  date_earned DATE NOT NULL,
  grade TEXT,
  semester TEXT,
  academic_year TEXT,
  course_type TEXT, -- e.g., 'core', 'elective', 'remedial'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes Needed table - tracks required courses for graduation
CREATE TABLE IF NOT EXISTS classes_needed (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  credit_value NUMERIC(4, 2) DEFAULT 1.0,
  priority_level TEXT DEFAULT 'medium', -- 'high', 'medium', 'low'
  subject_area TEXT, -- e.g., 'math', 'english', 'science', 'social_studies'
  graduation_requirement BOOLEAN DEFAULT TRUE,
  target_completion_date DATE,
  status TEXT DEFAULT 'needed', -- 'needed', 'in_progress', 'completed'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Steps Completed table - tracks daily/weekly progress steps
CREATE TABLE IF NOT EXISTS steps_completed (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  date_completed DATE NOT NULL,
  steps_count INTEGER NOT NULL DEFAULT 0,
  step_type TEXT DEFAULT 'academic', -- 'academic', 'behavioral', 'social'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Grades table - tracks current course grades and assessments
CREATE TABLE IF NOT EXISTS grades (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  grade_value NUMERIC(5, 2) NOT NULL,
  letter_grade TEXT,
  grade_type TEXT DEFAULT 'current', -- 'current', 'midterm', 'final', 'assignment'
  assignment_name TEXT,
  date_entered DATE NOT NULL DEFAULT CURRENT_DATE,
  semester TEXT,
  academic_year TEXT,
  weight NUMERIC(3, 2) DEFAULT 1.0, -- for weighted grades
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic Goals table - tracks student academic goals and milestones
CREATE TABLE IF NOT EXISTS academic_goals (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'paused', 'cancelled'
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  category TEXT DEFAULT 'academic', -- 'academic', 'behavioral', 'attendance'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Academic Progress Snapshots table - stores periodic progress summaries
CREATE TABLE IF NOT EXISTS academic_progress_snapshots (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_credits_earned NUMERIC(5, 2) DEFAULT 0,
  total_credits_needed NUMERIC(5, 2) DEFAULT 0,
  gpa NUMERIC(3, 2),
  attendance_rate NUMERIC(5, 2),
  behavioral_score NUMERIC(5, 2),
  on_track_for_graduation BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ensure only one snapshot per student per date
  CONSTRAINT unique_student_snapshot_date UNIQUE (student_id, snapshot_date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_credits_earned_student_id ON credits_earned(student_id);
CREATE INDEX IF NOT EXISTS idx_credits_earned_date ON credits_earned(date_earned);
CREATE INDEX IF NOT EXISTS idx_classes_needed_student_id ON classes_needed(student_id);
CREATE INDEX IF NOT EXISTS idx_classes_needed_status ON classes_needed(status);
CREATE INDEX IF NOT EXISTS idx_steps_completed_student_id ON steps_completed(student_id);
CREATE INDEX IF NOT EXISTS idx_steps_completed_date ON steps_completed(date_completed);
CREATE INDEX IF NOT EXISTS idx_grades_student_id ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_course ON grades(course_name);
CREATE INDEX IF NOT EXISTS idx_academic_goals_student_id ON academic_goals(student_id);
CREATE INDEX IF NOT EXISTS idx_academic_goals_status ON academic_goals(status);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_student_id ON academic_progress_snapshots(student_id);
CREATE INDEX IF NOT EXISTS idx_progress_snapshots_date ON academic_progress_snapshots(snapshot_date);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE credits_earned ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes_needed ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_progress_snapshots ENABLE ROW LEVEL SECURITY;

-- Create policies to allow anon access (for demo purposes)
-- Credits Earned policies
CREATE POLICY IF NOT EXISTS "Allow anon to read credits_earned" ON credits_earned FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert credits_earned" ON credits_earned FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update credits_earned" ON credits_earned FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete credits_earned" ON credits_earned FOR DELETE TO anon USING (true);

-- Classes Needed policies
CREATE POLICY IF NOT EXISTS "Allow anon to read classes_needed" ON classes_needed FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert classes_needed" ON classes_needed FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update classes_needed" ON classes_needed FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete classes_needed" ON classes_needed FOR DELETE TO anon USING (true);

-- Steps Completed policies
CREATE POLICY IF NOT EXISTS "Allow anon to read steps_completed" ON steps_completed FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert steps_completed" ON steps_completed FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update steps_completed" ON steps_completed FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete steps_completed" ON steps_completed FOR DELETE TO anon USING (true);

-- Grades policies
CREATE POLICY IF NOT EXISTS "Allow anon to read grades" ON grades FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert grades" ON grades FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update grades" ON grades FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete grades" ON grades FOR DELETE TO anon USING (true);

-- Academic Goals policies
CREATE POLICY IF NOT EXISTS "Allow anon to read academic_goals" ON academic_goals FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert academic_goals" ON academic_goals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update academic_goals" ON academic_goals FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete academic_goals" ON academic_goals FOR DELETE TO anon USING (true);

-- Academic Progress Snapshots policies
CREATE POLICY IF NOT EXISTS "Allow anon to read academic_progress_snapshots" ON academic_progress_snapshots FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert academic_progress_snapshots" ON academic_progress_snapshots FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update academic_progress_snapshots" ON academic_progress_snapshots FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete academic_progress_snapshots" ON academic_progress_snapshots FOR DELETE TO anon USING (true);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON credits_earned TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON classes_needed TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON steps_completed TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON grades TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON academic_goals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON academic_progress_snapshots TO anon, authenticated;

GRANT USAGE, SELECT ON SEQUENCE credits_earned_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE classes_needed_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE steps_completed_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE grades_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE academic_goals_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE academic_progress_snapshots_id_seq TO anon, authenticated;

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_credits_earned_updated_at BEFORE UPDATE ON credits_earned FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_needed_updated_at BEFORE UPDATE ON classes_needed FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_steps_completed_updated_at BEFORE UPDATE ON steps_completed FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_goals_updated_at BEFORE UPDATE ON academic_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_progress_snapshots_updated_at BEFORE UPDATE ON academic_progress_snapshots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data insertion functions for testing
-- Function to calculate GPA
CREATE OR REPLACE FUNCTION calculate_student_gpa(student_id_param BIGINT)
RETURNS NUMERIC(3,2) AS $$
DECLARE
    gpa_result NUMERIC(3,2);
BEGIN
    SELECT ROUND(AVG(
        CASE 
            WHEN letter_grade = 'A+' THEN 4.0
            WHEN letter_grade = 'A' THEN 4.0
            WHEN letter_grade = 'A-' THEN 3.7
            WHEN letter_grade = 'B+' THEN 3.3
            WHEN letter_grade = 'B' THEN 3.0
            WHEN letter_grade = 'B-' THEN 2.7
            WHEN letter_grade = 'C+' THEN 2.3
            WHEN letter_grade = 'C' THEN 2.0
            WHEN letter_grade = 'C-' THEN 1.7
            WHEN letter_grade = 'D+' THEN 1.3
            WHEN letter_grade = 'D' THEN 1.0
            WHEN letter_grade = 'F' THEN 0.0
            ELSE grade_value / 25.0 -- Convert percentage to 4.0 scale
        END
    ), 2) INTO gpa_result
    FROM grades 
    WHERE student_id = student_id_param 
    AND grade_type = 'final';
    
    RETURN COALESCE(gpa_result, 0.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get total credits earned
CREATE OR REPLACE FUNCTION get_total_credits_earned(student_id_param BIGINT)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    total_credits NUMERIC(5,2);
BEGIN
    SELECT COALESCE(SUM(credit_value), 0.0) INTO total_credits
    FROM credits_earned 
    WHERE student_id = student_id_param;
    
    RETURN total_credits;
END;
$$ LANGUAGE plpgsql;

-- Function to get total credits needed
CREATE OR REPLACE FUNCTION get_total_credits_needed(student_id_param BIGINT)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    total_needed NUMERIC(5,2);
BEGIN
    SELECT COALESCE(SUM(credit_value), 0.0) INTO total_needed
    FROM classes_needed 
    WHERE student_id = student_id_param 
    AND status = 'needed';
    
    RETURN total_needed;
END;
$$ LANGUAGE plpgsql;

-- View for academic progress dashboard
CREATE OR REPLACE VIEW academic_progress_dashboard AS
SELECT 
    s.id as student_id,
    s.student_name,
    s.grade_level,
    get_total_credits_earned(s.id) as credits_earned,
    get_total_credits_needed(s.id) as credits_needed,
    calculate_student_gpa(s.id) as current_gpa,
    (
        SELECT COUNT(*) 
        FROM steps_completed sc 
        WHERE sc.student_id = s.id 
        AND sc.date_completed >= CURRENT_DATE - INTERVAL '30 days'
    ) as steps_last_30_days,
    (
        SELECT COUNT(*) 
        FROM academic_goals ag 
        WHERE ag.student_id = s.id 
        AND ag.status = 'active'
    ) as active_goals,
    CASE 
        WHEN get_total_credits_earned(s.id) >= 
             (SELECT COALESCE(SUM(credit_value), 24.0) FROM classes_needed WHERE student_id = s.id)
        THEN true 
        ELSE false 
    END as on_track_for_graduation
FROM students s
WHERE s.active = true;

-- Comments for documentation
COMMENT ON TABLE credits_earned IS 'Tracks completed courses and earned credits for each student';
COMMENT ON TABLE classes_needed IS 'Tracks required courses and credits needed for graduation';
COMMENT ON TABLE steps_completed IS 'Tracks daily/weekly progress steps and achievements';
COMMENT ON TABLE grades IS 'Tracks current course grades and assessments';
COMMENT ON TABLE academic_goals IS 'Tracks student academic goals and milestones';
COMMENT ON TABLE academic_progress_snapshots IS 'Stores periodic academic progress summaries';
COMMENT ON VIEW academic_progress_dashboard IS 'Comprehensive view of student academic progress for dashboard display';