-- Common SQL Syntax Error Fixes for PostgreSQL
-- These are the most common causes of "syntax error at or near" errors

-- ❌ WRONG: Backslashes in regular strings
-- SELECT 'C:\temp\file.txt';  -- This will cause syntax error

-- ✅ CORRECT: Escape backslashes or use E'' strings
SELECT 'C:\\temp\\file.txt';  -- Double backslashes
-- OR
SELECT E'C:\temp\file.txt';   -- E-string with C-style escapes

-- ❌ WRONG: Single quotes inside strings without escaping
-- SELECT 'It's a test';  -- This will cause syntax error

-- ✅ CORRECT: Double the single quotes
SELECT 'It''s a test';

-- ❌ WRONG: Using psql meta-commands in SQL clients
-- \i filename.sql  -- This only works in psql command line

-- ✅ CORRECT: Use proper SQL import or run the file contents directly
-- (Copy and paste the file contents, or use your SQL client's import feature)

-- ❌ WRONG: Incorrect JSON path syntax
-- SELECT data->'key\subkey' FROM table;  -- Backslash not valid

-- ✅ CORRECT: Use proper JSON operators
SELECT data->'key'->'subkey' FROM table;
-- OR for text extraction
SELECT data->>'key' FROM table;

-- ❌ WRONG: Windows file paths without proper escaping
-- COPY table FROM 'C:\data\file.csv';

-- ✅ CORRECT: Properly escaped paths
COPY table FROM 'C:\\data\\file.csv';
-- OR
COPY table FROM E'C:\data\file.csv';

-- ❌ WRONG: Mixing quote types incorrectly
-- SELECT "column_name' FROM table;  -- Mixed quotes

-- ✅ CORRECT: Consistent quote usage
SELECT "column_name" FROM table;  -- Double quotes for identifiers
SELECT 'string_value' FROM table; -- Single quotes for strings

-- ❌ WRONG: Unterminated strings
-- SELECT 'incomplete string FROM table;

-- ✅ CORRECT: Properly terminated strings
SELECT 'complete string' FROM table;

-- ❌ WRONG: Invalid escape sequences
-- SELECT 'Line 1\nLine 2';  -- \n not recognized without E''

-- ✅ CORRECT: Use E-strings for escape sequences
SELECT E'Line 1\nLine 2';

-- EXAMPLE: Common fixes for academic progress queries
-- If you're getting syntax errors in dashboard queries, here are safe versions:

-- Safe student name handling with apostrophes
SELECT 
    student_name,
    CASE 
        WHEN student_name LIKE '%''%' THEN 'Name contains apostrophe'
        ELSE 'Regular name'
    END as name_type
FROM students;

-- Safe file path handling (if importing data)
-- Instead of: COPY students FROM 'C:\data\students.csv';
-- Use: COPY students FROM 'C:\\data\\students.csv' WITH CSV HEADER;

-- Safe JSON handling for time_slots or other JSONB fields
SELECT 
    student_name,
    time_slots->>'morning' as morning_behavior,
    time_slots->'afternoon'->>'score' as afternoon_score
FROM daily_evaluations;

-- Safe string concatenation with potential special characters
SELECT 
    student_name || ' - ' || COALESCE(teacher_name, 'No Teacher') as display_name
FROM students;

-- If you're using dynamic SQL, use proper quoting
DO $$
DECLARE
    table_name TEXT := 'students';
    sql_query TEXT;
BEGIN
    sql_query := 'SELECT COUNT(*) FROM ' || quote_ident(table_name);
    EXECUTE sql_query;
END $$;