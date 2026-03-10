-- Migration: Advanced Bed Management
-- 1. Update 'beds' status check constraint
-- First, drop the old constraint if we can find its name. 
-- Since we can't easily know the auto-generated name, we might trust the database to handle it or use a DO block.
-- A safer way is to alter the column type or drop constraints by pattern, but here we will try to just ADD the new values if it is an ENUM, or DROP CONSTRAINT if it is a CHECK.
-- The previous migration `033` likely used a CHECK constraint.
DO $$ BEGIN -- Drop the constraint if it exists (generic name guess or look up)
-- Typically: beds_status_check
IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'beds_status_check'
) THEN
ALTER TABLE beds DROP CONSTRAINT beds_status_check;
END IF;
END $$;
-- Re-add the constraint with new values
-- Old: 'Available', 'Occupied', 'Maintenance'
-- New: 'Available', 'Occupied', 'Discharge Ready', 'Dirty', 'Maintenance', 'Cleaning'
ALTER TABLE beds
ADD CONSTRAINT beds_status_check CHECK (
        status IN (
            'Available',
            'Occupied',
            'Discharge Ready',
            'Dirty',
            'Maintenance',
            'Cleaning'
        )
    );
-- 2. Update 'care_tasks' type check constraint
DO $$ BEGIN IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'care_tasks_type_check'
) THEN
ALTER TABLE care_tasks DROP CONSTRAINT care_tasks_type_check;
END IF;
END $$;
-- Add 'Housekeeping' to the allowed types
ALTER TABLE care_tasks
ADD CONSTRAINT care_tasks_type_check CHECK (
        type IN (
            'Medication',
            'Vitals',
            'Instruction',
            'Lab',
            'Surgery',
            'Assessment',
            'Housekeeping'
        )
    );