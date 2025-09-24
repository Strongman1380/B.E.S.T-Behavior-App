-- Migration to update incident_reports table structure
-- Run this in your Supabase SQL Editor

-- First, drop the existing table if it exists (will lose data!)
-- If you need to preserve existing data, create a backup first
DROP TABLE IF EXISTS incident_reports CASCADE;

-- Create the new incident_reports table with correct structure
CREATE TABLE incident_reports (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES students(id) ON DELETE CASCADE,
  student_name TEXT NOT NULL,
  staff_reporting TEXT NOT NULL,
  date_of_incident DATE NOT NULL,
  time_of_incident TIME,
  problem_behavior JSONB DEFAULT '[]',
  description_problem_behavior TEXT DEFAULT '',
  activity JSONB DEFAULT '[]',
  description_activity TEXT DEFAULT '',
  others_involved JSONB DEFAULT '[]',
  description_others_involved TEXT DEFAULT '',
  strategy_response JSONB DEFAULT '[]',
  description_strategy_response TEXT DEFAULT '',
  follow_up JSONB DEFAULT '[]',
  description_follow_up TEXT DEFAULT '',
  narrative TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE incident_reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY IF NOT EXISTS "Allow anon to read incident_reports" ON incident_reports FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert incident_reports" ON incident_reports FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update incident_reports" ON incident_reports FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete incident_reports" ON incident_reports FOR DELETE TO anon USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_incident_reports_updated_at
  BEFORE UPDATE ON incident_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();