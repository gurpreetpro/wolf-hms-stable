-- Migration: 099_add_platform_owner_role.sql
-- Description: Adds platform_owner and super_admin roles for multi-tenancy support
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
        role IN (
            'admin',
            'super_admin',
            'platform_owner',
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
            'housekeeping'
        )
    );