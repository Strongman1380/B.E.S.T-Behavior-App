-- Database Migration Script: Fix Data Persistence Issues
-- Run this script in your Supabase SQL Editor to fix Quick Score and Behavior Summary retention
-- This script preserves all existing data while adding necessary constraints and indexes

-- Step 1: Backup existing daily evaluations (optional but recommended)
-- CREATE TABLE daily_evaluations_backup AS SELECT * FROM daily_evaluations;

-- Step 2: Merge duplicate daily evaluations to preserve all data
WITH duplicates AS (
    SELECT student_id, date,
           string_agg(DISTINCT teacher_name, ', ') as merged_teacher_name,
           string_agg(DISTINCT school, ', ') as merged_school,
           string_agg(DISTINCT general_comments, E'\n---\n') as merged_comments,
           MIN(id) as keep_id,
           array_agg(time_slots) as all_time_slots,
           MIN(created_at) as earliest_created,
           MAX(updated_at) as latest_updated
    FROM daily_evaluations
    GROUP BY student_id, date
    HAVING COUNT(*) > 1
),
merged_time_slots AS (
    SELECT student_id, date, keep_id,
           jsonb_object_agg(
               slot_key,
               slot_data
           ) as merged_slots
    FROM duplicates d,
         LATERAL (
             SELECT jsonb_object_keys(time_slot) as slot_key,
                    time_slot->jsonb_object_keys(time_slot) as slot_data
             FROM unnest(d.all_time_slots) as time_slot
             WHERE time_slot IS NOT NULL AND time_slot != '{}'::jsonb
         ) slots
    GROUP BY student_id, date, keep_id
)
UPDATE daily_evaluations
SET
    teacher_name = COALESCE(d.merged_teacher_name, daily_evaluations.teacher_name),
    school = COALESCE(d.merged_school, daily_evaluations.school),
    general_comments = COALESCE(d.merged_comments, daily_evaluations.general_comments),
    time_slots = COALESCE(m.merged_slots, daily_evaluations.time_slots, '{}'),
    updated_at = d.latest_updated
FROM duplicates d
LEFT JOIN merged_time_slots m ON d.keep_id = m.keep_id
WHERE daily_evaluations.id = d.keep_id;

-- Step 3: Remove duplicate entries after merging data
DELETE FROM daily_evaluations
WHERE id NOT IN (
    SELECT MIN(id)
    FROM daily_evaluations
    GROUP BY student_id, date
);

-- Step 4: Add unique constraint to prevent future duplicates
ALTER TABLE daily_evaluations
DROP CONSTRAINT IF EXISTS unique_student_date_evaluation;

ALTER TABLE daily_evaluations
ADD CONSTRAINT unique_student_date_evaluation UNIQUE (student_id, date);

-- Step 5: Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_student_date ON daily_evaluations(student_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_evaluations_date ON daily_evaluations(date);
CREATE INDEX IF NOT EXISTS idx_behavior_summaries_student ON behavior_summaries(student_id);
CREATE INDEX IF NOT EXISTS idx_behavior_summaries_date_range ON behavior_summaries(date_from, date_to);

-- Step 6: Clean up any malformed time_slots data
UPDATE daily_evaluations
SET time_slots = '{}'::jsonb
WHERE time_slots IS NULL;

-- Step 7: Ensure behavior_summaries table has proper structure
-- Add missing columns if they don't exist
DO $$
BEGIN
    -- Check if summary_data column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'behavior_summaries'
        AND column_name = 'summary_data'
    ) THEN
        -- Migrate old behavior summaries to new structure
        ALTER TABLE behavior_summaries
        ADD COLUMN summary_data JSONB DEFAULT '{}';

        -- Move existing data into JSONB structure
        UPDATE behavior_summaries
        SET summary_data = jsonb_build_object(
            'general_behavior_overview', COALESCE(general_behavior_overview, ''),
            'strengths', COALESCE(strengths, ''),
            'improvements_needed', COALESCE(improvements_needed, ''),
            'behavioral_incidents', COALESCE(behavioral_incidents, ''),
            'summary_recommendations', COALESCE(summary_recommendations, ''),
            'prepared_by', COALESCE(prepared_by, '')
        )
        WHERE summary_data = '{}'::jsonb OR summary_data IS NULL;
    END IF;
END $$;

-- Step 8: Create updated_at function if it doesn't exist, then add triggers
DO $$
BEGIN
    -- First ensure the trigger function exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_proc
        WHERE proname = 'update_updated_at_column'
    ) THEN
        CREATE OR REPLACE FUNCTION update_updated_at_column()
        RETURNS TRIGGER AS $trigger$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $trigger$ language 'plpgsql';
    END IF;

    -- Then create triggers if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_daily_evaluations_updated_at'
    ) THEN
        CREATE TRIGGER update_daily_evaluations_updated_at
        BEFORE UPDATE ON daily_evaluations
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_behavior_summaries_updated_at'
    ) THEN
        CREATE TRIGGER update_behavior_summaries_updated_at
        BEFORE UPDATE ON behavior_summaries
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- Step 9: Verify data integrity
SELECT
    'Daily Evaluations' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as unique_students,
    MIN(date) as earliest_date,
    MAX(date) as latest_date
FROM daily_evaluations

UNION ALL

SELECT
    'Behavior Summaries' as table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT student_id) as unique_students,
    MIN(date_from) as earliest_date,
    MAX(date_to) as latest_date
FROM behavior_summaries;

-- Migration complete!
-- Your Quick Score sheets and Behavior Summaries should now be permanently retained.