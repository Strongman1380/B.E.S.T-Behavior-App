-- Bright Track Local Database Schema
-- SQLite Database for Student Behavior Tracking

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    grade_level TEXT,
    teacher_name TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Daily Evaluations table
CREATE TABLE IF NOT EXISTS daily_evaluations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    date DATE NOT NULL,
    teacher_name TEXT,
    school TEXT,
    time_slots TEXT, -- JSON string for time slot data
    general_comments TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
    UNIQUE(student_id, date)
);

-- Contact Logs table
CREATE TABLE IF NOT EXISTS contact_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    contact_date DATE NOT NULL,
    contact_person_name TEXT NOT NULL,
    contact_category TEXT NOT NULL,
    purpose_of_contact TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Incident Reports table
CREATE TABLE IF NOT EXISTS incident_reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    incident_date DATE NOT NULL,
    incident_time TIME,
    location TEXT,
    incident_type TEXT NOT NULL,
    severity_level TEXT NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    reported_by TEXT,
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    teacher_name TEXT,
    school_name TEXT,
    academic_year TEXT,
    grading_scale TEXT, -- JSON string for grading scale configuration
    notification_preferences TEXT, -- JSON string for notification settings
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_student_date ON daily_evaluations(student_id, date);
CREATE INDEX IF NOT EXISTS idx_contact_logs_student_date ON contact_logs(student_id, contact_date);
CREATE INDEX IF NOT EXISTS idx_incident_reports_student_date ON incident_reports(student_id, incident_date);
CREATE INDEX IF NOT EXISTS idx_students_name ON students(student_name);

-- Insert default settings if none exist
INSERT OR IGNORE INTO settings (id, teacher_name, school_name, academic_year, grading_scale)
VALUES (1, 'Teacher Name', 'School Name', '2024-2025', '{"excellent": 4, "good": 3, "satisfactory": 2, "needs_improvement": 1}');

-- Sample data has been moved to setup-sqlite.js
