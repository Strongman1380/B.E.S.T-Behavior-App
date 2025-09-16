-- Supabase Database Schema for Bright Track App
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/teiupxwqnbwopnixulay/sql

-- Students table
CREATE TABLE IF NOT EXISTS students (
  id BIGSERIAL PRIMARY KEY,
  student_name TEXT NOT NULL,
  grade_level TEXT,
  teacher_name TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Evaluations table
CREATE TABLE IF NOT EXISTS daily_evaluations (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  teacher_name TEXT,
  school TEXT,
  time_slots JSONB DEFAULT '{}',
  general_comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  id BIGSERIAL PRIMARY KEY,
  teacher_name TEXT,
  school_name TEXT,
  academic_year TEXT,
  grading_scale JSONB DEFAULT '{}',
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Contact Logs table
CREATE TABLE IF NOT EXISTS contact_logs (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  contact_date DATE NOT NULL,
  contact_person_name TEXT,
  contact_category TEXT,
  purpose_of_contact TEXT,
  outcome_of_contact TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Incident Reports table
CREATE TABLE IF NOT EXISTS incident_reports (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT,
  incident_date DATE NOT NULL,
  incident_time TIME,
  location TEXT,
  incident_type TEXT,
  severity_level TEXT,
  incident_summary TEXT,
  description TEXT,
  action_taken TEXT,
  reported_by TEXT,
  staff_name TEXT,
  staff_signature TEXT,
  follow_up_required BOOLEAN DEFAULT FALSE,
  follow_up_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Behavior Summaries table
CREATE TABLE IF NOT EXISTS behavior_summaries (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  date_from DATE NOT NULL,
  date_to DATE NOT NULL,
  summary_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Credits Earned table
CREATE TABLE IF NOT EXISTS credits_earned (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  credit_value NUMERIC(4, 2) NOT NULL,
  date_earned DATE NOT NULL,
  grade TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Classes Needed table
CREATE TABLE IF NOT EXISTS classes_needed (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  priority_level TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (for future authentication)
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT UNIQUE,
  name TEXT,
  role TEXT DEFAULT 'teacher',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE behavior_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits_earned ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes_needed ENABLE ROW LEVEL SECURITY;


-- Ensure anon/authenticated roles can access objects (required in addition to RLS)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;

-- Create policies to allow anon access (for demo purposes)
-- In production, you should restrict these based on user authentication

-- Students policies
CREATE POLICY IF NOT EXISTS "Allow anon to read students" ON students FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert students" ON students FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update students" ON students FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete students" ON students FOR DELETE TO anon USING (true);

-- Daily Evaluations policies
CREATE POLICY IF NOT EXISTS "Allow anon to read daily_evaluations" ON daily_evaluations FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert daily_evaluations" ON daily_evaluations FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update daily_evaluations" ON daily_evaluations FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete daily_evaluations" ON daily_evaluations FOR DELETE TO anon USING (true);

-- Settings policies
CREATE POLICY IF NOT EXISTS "Allow anon to read settings" ON settings FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert settings" ON settings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update settings" ON settings FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete settings" ON settings FOR DELETE TO anon USING (true);

-- Contact Logs policies
CREATE POLICY IF NOT EXISTS "Allow anon to read contact_logs" ON contact_logs FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert contact_logs" ON contact_logs FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update contact_logs" ON contact_logs FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete contact_logs" ON contact_logs FOR DELETE TO anon USING (true);

-- Incident Reports policies
CREATE POLICY IF NOT EXISTS "Allow anon to read incident_reports" ON incident_reports FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert incident_reports" ON incident_reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update incident_reports" ON incident_reports FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete incident_reports" ON incident_reports FOR DELETE TO anon USING (true);

-- Behavior Summaries policies
CREATE POLICY IF NOT EXISTS "Allow anon to read behavior_summaries" ON behavior_summaries FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert behavior_summaries" ON behavior_summaries FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update behavior_summaries" ON behavior_summaries FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete behavior_summaries" ON behavior_summaries FOR DELETE TO anon USING (true);

-- Users policies
CREATE POLICY IF NOT EXISTS "Allow anon to read users" ON users FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert users" ON users FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update users" ON users FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete users" ON users FOR DELETE TO anon USING (true);

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



-- Add updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_daily_evaluations_updated_at BEFORE UPDATE ON daily_evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_contact_logs_updated_at BEFORE UPDATE ON contact_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON incident_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_behavior_summaries_updated_at BEFORE UPDATE ON behavior_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credits_earned_updated_at BEFORE UPDATE ON credits_earned FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_needed_updated_at BEFORE UPDATE ON classes_needed FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Insert sample data (optional - remove if you don't want sample data)
INSERT INTO students (student_name, grade_level, teacher_name) VALUES
('Chance', '3rd Grade', 'Ms. Johnson'),
('Elijah', '4th Grade', 'Ms. Johnson'),
('Eloy', '2nd Grade', 'Ms. Johnson'),
('Emiliano (Nano)', '5th Grade', 'Ms. Johnson'),
('Curtis', '1st Grade', 'Ms. Johnson')
ON CONFLICT DO NOTHING;

INSERT INTO settings (teacher_name, school_name, academic_year, grading_scale, notification_preferences) VALUES
('Ms. Johnson', 'Bright Track Elementary', '2024-2025', 
 '{"excellent": 5, "good": 4, "satisfactory": 3, "needs_improvement": 2, "unsatisfactory": 1}',
 '{"email_notifications": true, "daily_summaries": true}')
ON CONFLICT DO NOTHING;
