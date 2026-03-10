-- Migration: 216_fix_users_sequence.sql
-- Description: Fix users_id_seq to prevent duplicate key error when creating users
-- Root Cause: Sequence is out of sync with existing data (manual inserts/seeds didn't increment it)
-- Reset sequence to MAX(id) + 1
SELECT setval(
        'users_id_seq',
        (
            SELECT COALESCE(MAX(id), 0) + 1
            FROM users
        ),
        false
    );
-- Verify: This should now return the correct next value
-- SELECT nextval('users_id_seq');