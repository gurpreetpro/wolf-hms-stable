-- ============================================================================
-- 075_fix_opd_status_constraint.sql
-- Fix opd_visits status constraint to include Cancelled and Rescheduled
-- This is a CRITICAL production fix
-- ============================================================================
-- Drop the existing constraint
ALTER TABLE opd_visits DROP CONSTRAINT IF EXISTS opd_visits_status_check;
-- Add new constraint with all required statuses
ALTER TABLE opd_visits
ADD CONSTRAINT opd_visits_status_check CHECK (
        status IN (
            'Waiting',
            'In-Consult',
            'Completed',
            'Cancelled',
            'Rescheduled',
            'No-Show'
        )
    );
-- Log the fix
DO $$ BEGIN RAISE NOTICE 'Fixed opd_visits status constraint to include Cancelled, Rescheduled, No-Show';
END $$;