-- Fix Missing Tables for Academic Progress Dashboard
-- Run this in your Supabase SQL Editor to resolve 404 errors

-- 1. Create steps_completed table (missing and causing 404)
CREATE TABLE IF NOT EXISTS public.steps_completed (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
  date_completed DATE NOT NULL,
  steps_count INTEGER NOT NULL DEFAULT 0,
  step_type TEXT DEFAULT 'academic',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create credits_earned table (if missing)
CREATE TABLE IF NOT EXISTS public.credits_earned (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  credit_value NUMERIC(4, 2) NOT NULL,
  date_earned DATE NOT NULL,
  grade TEXT,
  semester TEXT,
  academic_year TEXT,
  course_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create classes_needed table (if missing)
CREATE TABLE IF NOT EXISTS public.classes_needed (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  credit_value NUMERIC(4, 2) DEFAULT 1.0,
  priority_level TEXT DEFAULT 'medium',
  subject_area TEXT,
  graduation_requirement BOOLEAN DEFAULT TRUE,
  target_completion_date DATE,
  status TEXT DEFAULT 'needed',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create grades table (if missing)
CREATE TABLE IF NOT EXISTS public.grades (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  grade_value NUMERIC(5, 2) NOT NULL,
  letter_grade TEXT,
  grade_type TEXT DEFAULT 'current',
  assignment_name TEXT,
  date_entered DATE NOT NULL DEFAULT CURRENT_DATE,
  semester TEXT,
  academic_year TEXT,
  weight NUMERIC(3, 2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create academic_goals table (if missing)
CREATE TABLE IF NOT EXISTS public.academic_goals (
  id BIGSERIAL PRIMARY KEY,
  student_id BIGINT REFERENCES public.students(id) ON DELETE CASCADE,
  goal_title TEXT NOT NULL,
  goal_description TEXT,
  target_date DATE,
  status TEXT DEFAULT 'active',
  progress_percentage INTEGER DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  category TEXT DEFAULT 'academic',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create dashboards table (missing and causing 404)
CREATE TABLE IF NOT EXISTS public.dashboards (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  config JSONB DEFAULT '{}',
  is_default BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Enable Row Level Security
ALTER TABLE public.steps_completed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credits_earned ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes_needed ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS Policies (allow all for demo mode)
-- Steps Completed policies
CREATE POLICY IF NOT EXISTS "Allow anon to read steps_completed" ON public.steps_completed FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert steps_completed" ON public.steps_completed FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update steps_completed" ON public.steps_completed FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete steps_completed" ON public.steps_completed FOR DELETE TO anon USING (true);

-- Credits Earned policies
CREATE POLICY IF NOT EXISTS "Allow anon to read credits_earned" ON public.credits_earned FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert credits_earned" ON public.credits_earned FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update credits_earned" ON public.credits_earned FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete credits_earned" ON public.credits_earned FOR DELETE TO anon USING (true);

-- Classes Needed policies
CREATE POLICY IF NOT EXISTS "Allow anon to read classes_needed" ON public.classes_needed FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert classes_needed" ON public.classes_needed FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update classes_needed" ON public.classes_needed FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete classes_needed" ON public.classes_needed FOR DELETE TO anon USING (true);

-- Grades policies
CREATE POLICY IF NOT EXISTS "Allow anon to read grades" ON public.grades FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert grades" ON public.grades FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update grades" ON public.grades FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete grades" ON public.grades FOR DELETE TO anon USING (true);

-- Academic Goals policies
CREATE POLICY IF NOT EXISTS "Allow anon to read academic_goals" ON public.academic_goals FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert academic_goals" ON public.academic_goals FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update academic_goals" ON public.academic_goals FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete academic_goals" ON public.academic_goals FOR DELETE TO anon USING (true);

-- Dashboards policies
CREATE POLICY IF NOT EXISTS "Allow anon to read dashboards" ON public.dashboards FOR SELECT TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to insert dashboards" ON public.dashboards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "Allow anon to update dashboards" ON public.dashboards FOR UPDATE TO anon USING (true);
CREATE POLICY IF NOT EXISTS "Allow anon to delete dashboards" ON public.dashboards FOR DELETE TO anon USING (true);

-- 9. Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.steps_completed TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.credits_earned TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.classes_needed TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.grades TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academic_goals TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dashboards TO anon, authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 10. Create updated_at triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_steps_completed_updated_at BEFORE UPDATE ON public.steps_completed FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_credits_earned_updated_at BEFORE UPDATE ON public.credits_earned FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_needed_updated_at BEFORE UPDATE ON public.classes_needed FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_grades_updated_at BEFORE UPDATE ON public.grades FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_academic_goals_updated_at BEFORE UPDATE ON public.academic_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_dashboards_updated_at BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. Insert default dashboard
INSERT INTO public.dashboards (name, description, is_default, config) VALUES
('Academic Progress', 'Main academic progress dashboard', true, '{"widgets": ["credits", "grades", "goals", "progress"]}')
ON CONFLICT DO NOTHING;

-- 12. Add some sample data for testing (optional)
-- Insert sample steps for existing students
INSERT INTO public.steps_completed (student_id, date_completed, steps_count, step_type, description)
SELECT 
    id,
    CURRENT_DATE - (random() * 30)::int,
    (random() * 5 + 1)::int,
    'academic',
    'Sample progress step'
FROM public.students 
WHERE active = true
LIMIT 5
ON CONFLICT DO NOTHING;

-- Verify tables were created
SELECT 
    table_name,
    table_schema
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('steps_completed', 'credits_earned', 'classes_needed', 'grades', 'academic_goals', 'dashboards')
ORDER BY table_name;