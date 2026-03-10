-- Migration: 063_add_user_security_columns.sql
-- Description: Adds security question/answer columns to users table for account recovery/setup
ALTER TABLE users
ADD COLUMN IF NOT EXISTS security_question VARCHAR(255),
    ADD COLUMN IF NOT EXISTS security_answer VARCHAR(255),
    ADD COLUMN IF NOT EXISTS security_question_2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS security_answer_2 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS security_question_3 VARCHAR(255),
    ADD COLUMN IF NOT EXISTS security_answer_3 VARCHAR(255);