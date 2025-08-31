-- Bright Track PostgreSQL Database Schema
-- PostgreSQL Database for Student Behavior Tracking

-- Enable UUID extension for better IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id SERIAL PRIMARY KEY,
    student_name VARCHAR(255) NOT NULL,
    grade_level VARCHAR(100),
    teacher_name VARCHAR(255),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily Evaluations table
CREATE TABLE IF NOT EXISTS daily_evaluations (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    date DATE NOT NULL,
    teacher_name VARCHAR(255),
    school VARCHAR(255),
    time_slots JSONB, -- JSON for time slot data
    general_comments TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
);

-- Contact Logs table
CREATE TABLE IF NOT EXISTS contact_logs (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    contact_date DATE NOT NULL,
    contact_person_name VARCHAR(255) NOT NULL,
    contact_category VARCHAR(100) NOT NULL,
    purpose_of_contact TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Incident Reports table
CREATE TABLE IF NOT EXISTS incident_reports (
    id SERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL,
    incident_date DATE NOT NULL,
    incident_time TIME,
    location VARCHAR(255),
    incident_type VARCHAR(100) NOT NULL,
    severity_level VARCHAR(50) NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    reported_by VARCHAR(255),
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id SERIAL PRIMARY KEY,
    teacher_name VARCHAR(255),
    school_name VARCHAR(255),
    academic_year VARCHAR(50),
    grading_scale JSONB, -- JSON for grading scale configuration
    notification_preferences JSONB, -- JSON for notification settings
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_student_date ON daily_evaluations(student_id, date);
CREATE INDEX IF NOT EXISTS idx_contact_logs_student_date ON contact_logs(student_id, contact_date);
CREATE INDEX IF NOT EXISTS idx_incident_reports_student_date ON incident_reports(student_id, incident_date);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);
CREATE INDEX IF NOT EXISTS idx_students_active ON students(active);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at (drop and recreate to handle existing triggers)
DROP TRIGGER IF EXISTS update_students_updated_at ON students;
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_daily_evaluations_updated_at ON daily_evaluations;
CREATE TRIGGER update_daily_evaluations_updated_at BEFORE UPDATE ON daily_evaluations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_contact_logs_updated_at ON contact_logs;
CREATE TRIGGER update_contact_logs_updated_at BEFORE UPDATE ON contact_logs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_incident_reports_updated_at ON incident_reports;
CREATE TRIGGER update_incident_reports_updated_at BEFORE UPDATE ON incident_reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings if none exist
INSERT INTO settings (id, teacher_name, school_name, academic_year, grading_scale)
VALUES (1, 'Teacher Name', 'School Name', '2024-2025', '{"excellent": 4, "good": 3, "satisfactory": 2, "needs_improvement": 1}')
ON CONFLICT (id) DO NOTHING;