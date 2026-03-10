-- ============================================================================
-- 078_onboard_three_hospitals_and_slugs.sql
-- Purpose: Onboard 3 Specific Hospitals with Unique Codes/Slugs
-- ============================================================================
-- 1. Ensure 'code' and 'slug' columns exist in 'hospitals' table
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'code'
) THEN
ALTER TABLE hospitals
ADD COLUMN code VARCHAR(50) UNIQUE;
RAISE NOTICE 'Added code column to hospitals';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'slug'
) THEN
ALTER TABLE hospitals
ADD COLUMN slug VARCHAR(50) UNIQUE;
RAISE NOTICE 'Added slug column to hospitals';
END IF;
-- Add branding columns if missing
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'primary_color'
) THEN
ALTER TABLE hospitals
ADD COLUMN primary_color VARCHAR(20) DEFAULT '#3B82F6';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'secondary_color'
) THEN
ALTER TABLE hospitals
ADD COLUMN secondary_color VARCHAR(20) DEFAULT '#2563EB';
END IF;
IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'hospitals'
        AND column_name = 'logo_url'
) THEN
ALTER TABLE hospitals
ADD COLUMN logo_url TEXT;
END IF;
END $$;
-- 2. Upsert the 3 Hospitals
-- Using specific IDs to ensure consistency across environments
-- Hospital 1: Taneja Hospital (taneja.wolfhms.web.app)
INSERT INTO hospitals (
        id,
        name,
        address,
        phone,
        code,
        slug,
        primary_color,
        secondary_color
    )
VALUES (
        1,
        'Taneja Hospital',
        'Delhi, India',
        '+91-11-2222-3333',
        'taneja',
        'taneja',
        '#3B82F6',
        '#2563EB'
    ) ON CONFLICT (id) DO
UPDATE
SET code = 'taneja',
    slug = 'taneja',
    name = 'Taneja Hospital',
    primary_color = '#3B82F6',
    secondary_color = '#2563EB';
-- Hospital 2: Kokila Hospital (kokila.wolfhms.web.app)
INSERT INTO hospitals (
        id,
        name,
        address,
        phone,
        code,
        slug,
        primary_color,
        secondary_color
    )
VALUES (
        2,
        'Kokila Hospital',
        'Mumbai, India',
        '+91-22-4444-5555',
        'kokila',
        'kokila',
        '#10B981',
        '#059669'
    ) -- Green Theme
    ON CONFLICT (id) DO
UPDATE
SET code = 'kokila',
    slug = 'kokila',
    name = 'Kokila Hospital',
    primary_color = '#10B981',
    secondary_color = '#059669';
-- Hospital 3: Dr. Parveen Clinic (drparveen.wolfhms.web.app)
INSERT INTO hospitals (
        id,
        name,
        address,
        phone,
        code,
        slug,
        primary_color,
        secondary_color
    )
VALUES (
        3,
        'Dr. Parveen Clinic',
        'Bangalore, India',
        '+91-80-6666-7777',
        'drparveen',
        'drparveen',
        '#8B5CF6',
        '#7C3AED'
    ) -- Purple Theme
    ON CONFLICT (id) DO
UPDATE
SET code = 'drparveen',
    slug = 'drparveen',
    name = 'Dr. Parveen Clinic',
    primary_color = '#8B5CF6',
    secondary_color = '#7C3AED';
-- 3. Create Admin Users for each Hospital
-- Password for all is 'password1' -> $2b$10$CMn8yEp00H9rZ5EavT6oceSQs2956a/t42UeUVH/blLK3Id.M7.l.
-- Admin for Taneja (ID 1)
INSERT INTO users (
        username,
        password,
        email,
        role,
        is_active,
        hospital_id
    )
VALUES (
        'admin_taneja',
        '$2b$10$CMn8yEp00H9rZ5EavT6oceSQs2956a/t42UeUVH/blLK3Id.M7.l.',
        'admin@taneja.com',
        'admin',
        true,
        1
    ) ON CONFLICT (username) DO
UPDATE
SET password = '$2b$10$CMn8yEp00H9rZ5EavT6oceSQs2956a/t42UeUVH/blLK3Id.M7.l.',
    hospital_id = 1;
-- Admin for Kokila (ID 2)
INSERT INTO users (
        username,
        password,
        email,
        role,
        is_active,
        hospital_id
    )
VALUES (
        'admin_kokila',
        '$2b$10$CMn8yEp00H9rZ5EavT6oceSQs2956a/t42UeUVH/blLK3Id.M7.l.',
        'admin@kokila.com',
        'admin',
        true,
        2
    ) ON CONFLICT (username) DO
UPDATE
SET password = '$2b$10$CMn8yEp00H9rZ5EavT6oceSQs2956a/t42UeUVH/blLK3Id.M7.l.',
    hospital_id = 2;
-- Admin for Dr. Parveen (ID 3)
INSERT INTO users (
        username,
        password,
        email,
        role,
        is_active,
        hospital_id
    )
VALUES (
        'admin_parveen',
        '$2b$10$CMn8yEp00H9rZ5EavT6oceSQs2956a/t42UeUVH/blLK3Id.M7.l.',
        'admin@drparveen.com',
        'admin',
        true,
        3
    ) ON CONFLICT (username) DO
UPDATE
SET password = '$2b$10$CMn8yEp00H9rZ5EavT6oceSQs2956a/t42UeUVH/blLK3Id.M7.l.',
    hospital_id = 3;
-- 4. Reset sequences to avoid conflicts for future inserts
SELECT setval(
        'hospitals_id_seq',
        (
            SELECT MAX(id)
            FROM hospitals
        )
    );
-- Verify User ID seq too if needed, but not strictly required if we let serial handle new ones (we didn't force ID for users)
-- End of migration