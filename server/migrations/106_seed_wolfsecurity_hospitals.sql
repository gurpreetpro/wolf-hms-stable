-- Migration 106: Seed Wolf Security Hospitals
-- Ensures correct subdomain mapping for wolfsecurity.in
-- 1. Update/Ensure Kokila Hospital (ID 1)
INSERT INTO hospitals (id, code, name, subdomain, subscription_tier)
VALUES (
        1,
        'kokila',
        -- Changed from 'default' to 'kokila' to match fallback logic if needed
        'Kokila Hospital',
        'kokila',
        -- Matches 'kokila.wolfsecurity.in'
        'enterprise'
    ) ON CONFLICT (id) DO
UPDATE
SET code = EXCLUDED.code,
    name = EXCLUDED.name,
    subdomain = EXCLUDED.subdomain;
-- 2. Create Dr. Parveen Hospital (ID 2)
INSERT INTO hospitals (id, code, name, subdomain, subscription_tier)
VALUES (
        2,
        'drparveen',
        'Dr. Parveen Hospital',
        'drparveen',
        -- Matches 'drparveen.wolfsecurity.in'
        'professional'
    ) ON CONFLICT (id) DO
UPDATE
SET code = EXCLUDED.code,
    name = EXCLUDED.name,
    subdomain = EXCLUDED.subdomain;
-- 3. Reset ID sequence to avoid collisions
SELECT setval(
        'hospitals_id_seq',
        (
            SELECT MAX(id)
            FROM hospitals
        )
    );