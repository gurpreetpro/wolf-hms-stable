-- Migration: 098_fix_users_role_check.sql
-- Description: Updates users_role_check constraint to include all roles used in the frontend
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'admin',
            'doctor',
            'nurse',
            'receptionist',
            'lab_tech',
            'pharmacist',
            'anaesthetist',
            'security_guard',
            'patient',
            'user',
            'ward_incharge',
            'radiologist',
            'billing',
            'blood_bank_tech',
            'housekeeping',
            'super_admin',
            'developer',
            'platform_admin',
            'platform_owner',
            'inventory_manager',
            'dietician'
        )
    );