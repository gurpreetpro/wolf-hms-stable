-- Migration: Reset Admin Password
-- Description: Forces admin_user password to be 'password123' (hashed) to resolve login issues.
UPDATE users
SET password = '$2b$10$qW7Il1AkceF/oWAC8lOzEeK2AQE5mMT8GjweTzCXGMdACCejXoLOS'
WHERE username = 'admin_user';
-- Ensure admin exists (safety fallback)
INSERT INTO users (
        username,
        password,
        role,
        hospital_id,
        email,
        is_active
    )
SELECT 'admin_user',
    '$2b$10$qW7Il1AkceF/oWAC8lOzEeK2AQE5mMT8GjweTzCXGMdACCejXoLOS',
    'admin',
    1,
    'admin@wolfhms.com',
    true
WHERE NOT EXISTS (
        SELECT 1
        FROM users
        WHERE username = 'admin_user'
    );