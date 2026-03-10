-- Migration 322: Fix hospital_id FK Type Mismatch
-- Description: Fixes type mismatch where user_sessions.hospital_id is UUID but hospitals.id is INTEGER
-- Date: 2026-01-21
-- Step 1: Drop the problematic constraint if it exists
ALTER TABLE user_sessions DROP CONSTRAINT IF EXISTS user_sessions_hospital_id_fkey;
-- Step 2: Check and convert hospital_id column type
DO $$
DECLARE col_type TEXT;
BEGIN -- Get current column type
SELECT data_type INTO col_type
FROM information_schema.columns
WHERE table_name = 'user_sessions'
    AND column_name = 'hospital_id';
-- If UUID, convert to INTEGER
IF col_type = 'uuid' THEN -- First set all values to NULL (data loss acceptable for sessions)
UPDATE user_sessions
SET hospital_id = NULL;
-- Alter column type
ALTER TABLE user_sessions
ALTER COLUMN hospital_id TYPE INTEGER USING NULL;
RAISE NOTICE 'Converted user_sessions.hospital_id from UUID to INTEGER';
ELSIF col_type IS NULL THEN -- Column doesn't exist, add it
ALTER TABLE user_sessions
ADD COLUMN hospital_id INTEGER;
RAISE NOTICE 'Added hospital_id column to user_sessions';
ELSE RAISE NOTICE 'user_sessions.hospital_id is already type: %',
col_type;
END IF;
END $$;
-- Step 3: Re-add the FK constraint (only if hospitals table exists with integer id)
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'id'
        AND data_type = 'integer'
) THEN
ALTER TABLE user_sessions
ADD CONSTRAINT user_sessions_hospital_id_fkey FOREIGN KEY (hospital_id) REFERENCES hospitals(id) ON DELETE
SET NULL;
RAISE NOTICE 'Added FK constraint user_sessions_hospital_id_fkey';
END IF;
END $$;
-- Step 4: Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_sessions_hospital ON user_sessions(hospital_id);
COMMENT ON COLUMN user_sessions.hospital_id IS 'References hospitals.id (INTEGER) for multi-tenant session tracking';