-- Migration: 084_ensure_registration_columns.sql
-- Purpose: Ensure all columns required for public registration exist in users table
-- This prevents PostgreSQL error 42703 (undefined column) on fresh deployments
DO $$ BEGIN -- full_name column (required for registration)
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'full_name'
) THEN
ALTER TABLE users
ADD COLUMN full_name VARCHAR(255);
RAISE NOTICE 'Added full_name column to users table';
END IF;
-- department column (required for staff registration)
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'department'
) THEN
ALTER TABLE users
ADD COLUMN department VARCHAR(255);
RAISE NOTICE 'Added department column to users table';
END IF;
-- Security question columns (required for password recovery)
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'security_question'
) THEN
ALTER TABLE users
ADD COLUMN security_question TEXT;
RAISE NOTICE 'Added security_question column to users table';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'security_answer'
) THEN
ALTER TABLE users
ADD COLUMN security_answer TEXT;
RAISE NOTICE 'Added security_answer column to users table';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'security_question_2'
) THEN
ALTER TABLE users
ADD COLUMN security_question_2 TEXT;
RAISE NOTICE 'Added security_question_2 column to users table';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'security_answer_2'
) THEN
ALTER TABLE users
ADD COLUMN security_answer_2 TEXT;
RAISE NOTICE 'Added security_answer_2 column to users table';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'security_question_3'
) THEN
ALTER TABLE users
ADD COLUMN security_question_3 TEXT;
RAISE NOTICE 'Added security_question_3 column to users table';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'security_answer_3'
) THEN
ALTER TABLE users
ADD COLUMN security_answer_3 TEXT;
RAISE NOTICE 'Added security_answer_3 column to users table';
END IF;
-- approval_status column (required for public registration workflow)
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
        AND column_name = 'approval_status'
) THEN
ALTER TABLE users
ADD COLUMN approval_status VARCHAR(20) DEFAULT 'APPROVED';
RAISE NOTICE 'Added approval_status column to users table';
END IF;
RAISE NOTICE '084_ensure_registration_columns.sql: All registration columns verified/added';
END $$;