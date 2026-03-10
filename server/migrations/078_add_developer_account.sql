-- ============================================================================
-- 078_add_developer_account.sql
-- Creates developer account for Developer Dashboard access
-- ============================================================================
-- Insert developer account with correct column name
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM users
    WHERE email = 'developer@wolfhms.com'
) THEN
INSERT INTO users (
        username,
        email,
        password,
        role,
        hospital_id,
        full_name,
        is_active,
        created_at
    )
VALUES (
        'developer',
        'developer@wolfhms.com',
        '$2b$10$IQnwGHdUXlM7QxLQuQHMNO45BL8MTY5Zfq4g3H.5UKXqANqCsLmHy',
        'admin',
        1,
        'Wolf Developer',
        true,
        NOW()
    ) ON CONFLICT (username) DO
UPDATE
SET password = '$2b$10$IQnwGHdUXlM7QxLQuQHMNO45BL8MTY5Zfq4g3H.5UKXqANqCsLmHy',
    role = 'admin',
    is_active = true;
END IF;
RAISE NOTICE '078_add_developer_account.sql: Developer account created/updated successfully';
END $$;