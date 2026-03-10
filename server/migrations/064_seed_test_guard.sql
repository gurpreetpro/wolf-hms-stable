-- Migration: 064_seed_test_guard.sql
-- Description: Inserts a test guard user for mobile app verification
-- Password is 'password123' (hashed)
INSERT INTO users (username, password, role, email)
VALUES (
        'Guard One',
        '$2b$10$BnNtIArS.fK0EtoCWGCLWOKEUxc844Yvj2wRWhkD7YNpmIc57Q/I.i',
        'security_guard',
        'guard1@wolfsecurity.com'
    ) ON CONFLICT (email) DO NOTHING;