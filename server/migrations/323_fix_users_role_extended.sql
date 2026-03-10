-- Migration 323: Fix Users Role Check Constraint (Extended)
-- Description: Updates users_role_check constraint to include ALL roles used across the system
-- Date: 2026-01-21
-- Drop existing constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- Add updated constraint with comprehensive role list
ALTER TABLE users
ADD CONSTRAINT users_role_check CHECK (
        role IN (
            -- Core Hospital Roles
            'admin',
            'super_admin',
            'doctor',
            'nurse',
            'receptionist',
            'pharmacist',
            'lab_tech',
            'lab_technician',
            'radiologist',
            'anaesthetist',
            'ward_incharge',
            -- Support Roles
            'billing',
            'accountant',
            'inventory_manager',
            'housekeeping',
            'dietary',
            'dietician',
            -- Specialized Roles
            'blood_bank_tech',
            'security',
            'security_guard',
            'guard',
            -- Platform Roles
            'platform_admin',
            'platform_owner',
            'developer',
            -- Patient/User Roles
            'patient',
            'user',
            -- Mobile App Roles (Wolf Guard, Wolf Care)
            'mobile_patient',
            'mobile_doctor',
            'mobile_nurse',
            -- Emergency/Special Roles
            'emergency',
            'ot_coordinator',
            'cssd_tech'
        )
    );
COMMENT ON TABLE users IS 'All system users - role constraint updated 2026-01-21 to include all valid roles';