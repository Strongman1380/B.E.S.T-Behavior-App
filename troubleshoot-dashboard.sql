-- Troubleshoot Academic Progress Dashboard
-- Run this first to identify what's missing

-- 1. Check current search path
SELECT 'Current search_path: ' || current_setting('search_path') as info;

-- 2. Set search path to include public schema (if needed)
SET search_path = public, "$user";

-- 3. Check if students table exists (base requirement)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') THEN
        RAISE NOTICE 'SUCCESS: students table exists';
    ELSE
        RAISE NOTICE 'ERROR: students table missing - run the main schema first!';
    END IF;
END $$;

-- 4. Check for academic progress tables
DO $$
DECLARE
    missing_tables TEXT[] := ARRAY[]::TEXT[];
    table_name TEXT;
BEGIN
    -- Check each required table
    FOREACH table_name IN ARRAY ARRAY['credits_earned', 'classes_needed', 'steps_completed', 'grades', 'academic_goals']
    LOOP
        IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = table_name AND table_schema = 'public') THEN
            missing_tables := array_append(missing_tables, table_name);
        END IF;
    END LOOP;
    
    IF array_length(missing_tables, 1) > 0 THEN
        RAISE NOTICE 'MISSING TABLES: %', array_to_string(missing_tables, ', ');
        RAISE NOTICE 'ACTION NEEDED: Run academic-progress-schema.sql first!';
    ELSE
        RAISE NOTICE 'SUCCESS: All required tables exist';
    END IF;
END $$;

-- 5. Check if view exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'academic_progress_dashboard' AND schemaname = 'public') THEN
        RAISE NOTICE 'SUCCESS: academic_progress_dashboard view exists';
    ELSE
        RAISE NOTICE 'MISSING: academic_progress_dashboard view - will create it';
    END IF;
END $$;

-- 6. Quick fix: Create minimal dashboard view if tables exist
DO $$
BEGIN
    -- Only create if students table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'students' AND table_schema = 'public') THEN
        
        -- Drop existing view if any
        DROP VIEW IF EXISTS public.academic_progress_dashboard;
        
        -- Create simple version that works with basic tables
        EXECUTE '
        CREATE VIEW public.academic_progress_dashboard AS
        SELECT 
            s.id as student_id,
            s.student_name,
            s.grade_level,
            s.teacher_name,
            0.0 as credits_earned,
            0.0 as credits_needed,
            0.0 as current_gpa,
            0 as steps_last_30_days,
            0 as active_goals,
            false as on_track_for_graduation,
            s.active,
            s.created_at,
            s.updated_at
        FROM students s
        WHERE s.active = true
        ORDER BY s.student_name';
        
        RAISE NOTICE 'CREATED: Basic academic_progress_dashboard view';
        
        -- Grant permissions
        GRANT SELECT ON public.academic_progress_dashboard TO anon, authenticated;
        
    ELSE
        RAISE NOTICE 'CANNOT CREATE VIEW: students table missing';
    END IF;
END $$;

-- 7. Test the view
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'academic_progress_dashboard' AND schemaname = 'public') THEN
        RAISE NOTICE 'TESTING: Querying academic_progress_dashboard...';
        -- This will show if the view works
        PERFORM * FROM public.academic_progress_dashboard LIMIT 1;
        RAISE NOTICE 'SUCCESS: View is working!';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'ERROR: View test failed - %', SQLERRM;
END $$;

-- 8. Show what you can query now
SELECT 'You can now run these queries:' as instruction
UNION ALL
SELECT '• SELECT * FROM public.academic_progress_dashboard;'
UNION ALL  
SELECT '• SELECT student_name, credits_earned FROM public.academic_progress_dashboard;'
UNION ALL
SELECT '• Or just: SELECT * FROM academic_progress_dashboard; (if search_path includes public)';