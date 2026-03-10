-- Migration: Add audit columns to care_tasks
ALTER TABLE care_tasks
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;
ALTER TABLE care_tasks
ADD COLUMN IF NOT EXISTS updated_by INT REFERENCES users(id);