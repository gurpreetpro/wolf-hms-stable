-- Wolf Migrator (Vampire Strategy) Tables
-- Migration ID: 116
-- Description: Adds tables for CSV data import feature
CREATE TABLE IF NOT EXISTS migration_jobs (
    id SERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'UPLOADED',
    total_rows INTEGER DEFAULT 0,
    valid_rows INTEGER DEFAULT 0,
    error_rows INTEGER DEFAULT 0,
    mapping_config JSONB,
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    hospital_id INTEGER
);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_hospital ON migration_jobs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_migration_jobs_status ON migration_jobs(status);
CREATE TABLE IF NOT EXISTS migration_errors (
    id SERIAL PRIMARY KEY,
    job_id INTEGER REFERENCES migration_jobs(id) ON DELETE CASCADE,
    row_number INTEGER,
    row_data JSONB,
    error_message TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_migration_errors_job ON migration_errors(job_id);