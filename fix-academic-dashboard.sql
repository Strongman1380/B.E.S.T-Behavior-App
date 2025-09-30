-- Fix Academic Progress Dashboard - Diagnostic and Repair Script
-- Run this to diagnose and fix the "relation does not exist" error

-- 1. DIAGNOSTIC QUERIES
-- Check if the view exists
SELECT schemaname, viewname, definition 
FROM pg_views 
WHERE viewname = 'academic_progress_dashboard';

-- Check if required tables exist
SELECT table_schema, table_name 
FROM information_schema.tables 
WHERE table_name IN ('students', 'credits_earned', 'classes_needed', 'steps_completed', 'academic_goals')
AND table_schema = 'public';

-- Check current search path
SHOW search_path;

-- Check if functions exist
SELECT routine_schema, routine_name, routine_type
FROM information_schema.routines 
WHERE routine_name IN ('get_total_credits_earned', 'get_total_credits_needed', 'calculate_student_gpa')
AND routine_schema = 'public';

-- 2. ENSURE ALL REQUIRED FUNCTIONS EXIST
-- Function to calculate GPA (recreate if missing)
CREATE OR REPLACE FUNCTION public.calculate_student_gpa(student_id_param BIGINT)
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
            ELSE CASE 
                WHEN grade_value >= 97 THEN 4.0
                WHEN grade_value >= 93 THEN 4.0
                WHEN grade_value >= 90 THEN 3.7
                WHEN grade_value >= 87 THEN 3.3
                WHEN grade_value >= 83 THEN 3.0
                WHEN grade_value >= 80 THEN 2.7
                WHEN grade_value >= 77 THEN 2.3
                WHEN grade_value >= 73 THEN 2.0
                WHEN grade_value >= 70 THEN 1.7
                WHEN grade_value >= 67 THEN 1.3
                WHEN grade_value >= 65 THEN 1.0
                ELSE 0.0
            END
        END
    ), 2) INTO gpa_result
    FROM grades 
    WHERE student_id = student_id_param 
    AND grade_type IN ('final', 'current');
    
    RETURN COALESCE(gpa_result, 0.0);
END;
$$ LANGUAGE plpgsql;

-- Function to get total credits earned (recreate if missing)
CREATE OR REPLACE FUNCTION public.get_total_credits_earned(student_id_param BIGINT)
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

-- Function to get total credits needed (recreate if missing)
CREATE OR REPLACE FUNCTION public.get_total_credits_needed(student_id_param BIGINT)
RETURNS NUMERIC(5,2) AS $$
DECLARE
    total_needed NUMERIC(5,2);
BEGIN
    SELECT COALESCE(SUM(credit_value), 0.0) INTO total_needed
    FROM classes_needed 
    WHERE student_id = student_id_param 
    AND status IN ('needed', 'in_progress');
    
    RETURN total_needed;
END;
$$ LANGUAGE plpgsql;

-- 3. CREATE/RECREATE THE ACADEMIC PROGRESS DASHBOARD VIEW
-- Drop the view if it exists (to recreate it)
DROP VIEW IF EXISTS public.academic_progress_dashboard;

-- Create the view with proper schema qualification
CREATE VIEW public.academic_progress_dashboard AS
SELECT 
    s.id as student_id,
    s.student_name,
    s.grade_level,
    s.teacher_name,
    public.get_total_credits_earned(s.id) as credits_earned,
    public.get_total_credits_needed(s.id) as credits_needed,
    public.calculate_student_gpa(s.id) as current_gpa,
    (
        SELECT COALESCE(SUM(steps_count), 0)
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
    (
        SELECT ROUND(AVG(progress_percentage), 1)
        FROM academic_goals ag 
        WHERE ag.student_id = s.id 
        AND ag.status = 'active'
    ) as avg_goal_progress,
    CASE 
        WHEN public.get_total_credits_earned(s.id) >= 
             GREATEST(public.get_total_credits_needed(s.id), 24.0)
        THEN true 
        ELSE false 
    END as on_track_for_graduation,
    (
        SELECT COUNT(*)
        FROM grades g
        WHERE g.student_id = s.id
        AND g.grade_type = 'current'
        AND (g.grade_value < 70 OR g.letter_grade IN ('F', 'D'))
    ) as failing_courses,
    s.created_at,
    s.updated_at
FROM students s
WHERE s.active = true
ORDER BY s.student_name;

-- 4. GRANT PERMISSIONS ON THE VIEW
GRANT SELECT ON public.academic_progress_dashboard TO anon, authenticated;

-- 5. CREATE ALTERNATIVE SIMPLE VIEW (if functions fail)
CREATE OR REPLACE VIEW public.academic_progress_simple AS
SELECT 
    s.id as student_id,
    s.student_name,
    s.grade_level,
    s.teacher_name,
    COALESCE(ce.total_credits, 0) as credits_earned,
    COALESCE(cn.needed_credits, 0) as credits_needed,
    COALESCE(g.avg_grade, 0) as current_avg_grade,
    COALESCE(sc.recent_steps, 0) as steps_last_30_days,
    COALESCE(ag.active_goals, 0) as active_goals,
    s.active,
    s.created_at,
    s.updated_at
FROM students s
LEFT JOIN (
    SELECT student_id, SUM(credit_value) as total_credits
    FROM credits_earned
    GROUP BY student_id
) ce ON s.id = ce.student_id
LEFT JOIN (
    SELECT student_id, SUM(credit_value) as needed_credits
    FROM classes_needed
    WHERE status IN ('needed', 'in_progress')
    GROUP BY student_id
) cn ON s.id = cn.student_id
LEFT JOIN (
    SELECT student_id, AVG(grade_value) as avg_grade
    FROM grades
    WHERE grade_type = 'current'
    GROUP BY student_id
) g ON s.id = g.student_id
LEFT JOIN (
    SELECT student_id, SUM(steps_count) as recent_steps
    FROM steps_completed
    WHERE date_completed >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY student_id
) sc ON s.id = sc.student_id
LEFT JOIN (
    SELECT student_id, COUNT(*) as active_goals
    FROM academic_goals
    WHERE status = 'active'
    GROUP BY student_id
) ag ON s.id = ag.student_id
WHERE s.active = true
ORDER BY s.student_name;

-- Grant permissions on simple view
GRANT SELECT ON public.academic_progress_simple TO anon, authenticated;

-- 6. TEST QUERIES
-- Test if view works now
SELECT 'Testing academic_progress_dashboard view:' as test_name;
SELECT COUNT(*) as total_students FROM public.academic_progress_dashboard;

-- Test simple view as backup
SELECT 'Testing academic_progress_simple view:' as test_name;
SELECT COUNT(*) as total_students FROM public.academic_progress_simple;

-- Show sample data from main view (if it works)
SELECT * FROM public.academic_progress_dashboard LIMIT 3;

-- 7. VERIFICATION QUERIES
-- Verify all required tables exist and have data
SELECT 
    'students' as table_name, 
    COUNT(*) as row_count 
FROM students
UNION ALL
SELECT 
    'credits_earned' as table_name, 
    COUNT(*) as row_count 
FROM credits_earned
UNION ALL
SELECT 
    'classes_needed' as table_name, 
    COUNT(*) as row_count 
FROM classes_needed
UNION ALL
SELECT 
    'steps_completed' as table_name, 
    COUNT(*) as row_count 
FROM steps_completed
UNION ALL
SELECT 
    'grades' as table_name, 
    COUNT(*) as row_count 
FROM grades
UNION ALL
SELECT 
    'academic_goals' as table_name, 
    COUNT(*) as row_count 
FROM academic_goals;

-- Final confirmation
SELECT 'Setup complete! You can now use:' as message
UNION ALL
SELECT '1. SELECT * FROM public.academic_progress_dashboard;' as message
UNION ALL
SELECT '2. SELECT * FROM public.academic_progress_simple; (backup view)' as message;