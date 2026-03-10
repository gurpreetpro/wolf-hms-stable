-- ============================================================================
-- 300_row_level_security.sql
-- WOLF HMS - Phase 1: Iron Dome Security Upgrade
-- Implements PostgreSQL Row Level Security (RLS) for Multi-Tenant Isolation
-- ============================================================================
-- Step 1: Create a helper function to get current tenant
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS INTEGER AS $$ BEGIN RETURN NULLIF(current_setting('app.current_tenant', true), '')::INTEGER;
EXCEPTION
WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;
-- Step 2: Enable RLS on all sensitive tables
-- Note: We enable but also use FORCE to apply to table owners
-- PATIENTS (Most Critical)
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients FORCE ROW LEVEL SECURITY;
-- ADMISSIONS
ALTER TABLE admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admissions FORCE ROW LEVEL SECURITY;
-- OPD VISITS
ALTER TABLE opd_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE opd_visits FORCE ROW LEVEL SECURITY;
-- LAB REQUESTS
ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_requests FORCE ROW LEVEL SECURITY;
-- LAB RESULTS
ALTER TABLE lab_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_results FORCE ROW LEVEL SECURITY;
-- INVOICES
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
-- PAYMENTS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments FORCE ROW LEVEL SECURITY;
-- PRESCRIPTIONS
ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescriptions FORCE ROW LEVEL SECURITY;
-- CARE TASKS
ALTER TABLE care_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_tasks FORCE ROW LEVEL SECURITY;
-- VITALS LOGS
ALTER TABLE vitals_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE vitals_logs FORCE ROW LEVEL SECURITY;
-- INVENTORY ITEMS
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items FORCE ROW LEVEL SECURITY;
-- Step 3: Create Tenant Isolation Policies
-- Pattern: Allow SELECT/INSERT/UPDATE/DELETE only if hospital_id matches current tenant
-- PATIENTS Policy
DROP POLICY IF EXISTS tenant_isolation_patients ON patients;
CREATE POLICY tenant_isolation_patients ON patients FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL -- Allow bypass when no tenant set (migration/admin)
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- ADMISSIONS Policy
DROP POLICY IF EXISTS tenant_isolation_admissions ON admissions;
CREATE POLICY tenant_isolation_admissions ON admissions FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- OPD VISITS Policy  
DROP POLICY IF EXISTS tenant_isolation_opd_visits ON opd_visits;
CREATE POLICY tenant_isolation_opd_visits ON opd_visits FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- LAB REQUESTS Policy
DROP POLICY IF EXISTS tenant_isolation_lab_requests ON lab_requests;
CREATE POLICY tenant_isolation_lab_requests ON lab_requests FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- LAB RESULTS Policy
DROP POLICY IF EXISTS tenant_isolation_lab_results ON lab_results;
CREATE POLICY tenant_isolation_lab_results ON lab_results FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- INVOICES Policy
DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
CREATE POLICY tenant_isolation_invoices ON invoices FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- PAYMENTS Policy
DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
CREATE POLICY tenant_isolation_payments ON payments FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- PRESCRIPTIONS Policy
DROP POLICY IF EXISTS tenant_isolation_prescriptions ON prescriptions;
CREATE POLICY tenant_isolation_prescriptions ON prescriptions FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- CARE TASKS Policy
DROP POLICY IF EXISTS tenant_isolation_care_tasks ON care_tasks;
CREATE POLICY tenant_isolation_care_tasks ON care_tasks FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- VITALS LOGS Policy
DROP POLICY IF EXISTS tenant_isolation_vitals_logs ON vitals_logs;
CREATE POLICY tenant_isolation_vitals_logs ON vitals_logs FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- INVENTORY ITEMS Policy
DROP POLICY IF EXISTS tenant_isolation_inventory_items ON inventory_items;
CREATE POLICY tenant_isolation_inventory_items ON inventory_items FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
);
-- Step 4: Add more tables as needed (security sensitive)
-- USERS (filter by hospital for non-platform roles)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE users FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users FOR ALL USING (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
    OR role IN ('super_admin', 'platform_owner') -- Platform admins see all
) WITH CHECK (
    hospital_id = current_tenant_id()
    OR current_tenant_id() IS NULL
    OR role IN ('super_admin', 'platform_owner')
);
-- Step 5: Emergency Bypass Role (for migrations/admin scripts)
-- Create a role that bypasses RLS (use with caution)
DO $$ BEGIN IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'rls_bypass'
) THEN CREATE ROLE rls_bypass NOLOGIN;
END IF;
END $$;
-- Grant bypass to tables (admin scripts can SET ROLE rls_bypass)
ALTER TABLE patients OWNER TO CURRENT_USER;
GRANT BYPASSRLS ON ALL TABLES IN SCHEMA public TO rls_bypass;
-- ============================================================================
-- VERIFICATION QUERIES (Run after migration)
-- ============================================================================
-- Test 1: Without tenant set, should return nothing (or error)
-- SET app.current_tenant TO '';
-- SELECT COUNT(*) FROM patients;
-- Test 2: With tenant set, should return only that hospital's data
-- SET app.current_tenant TO '1';
-- SELECT COUNT(*) FROM patients;
-- ============================================================================
-- ROLLBACK (If needed)
-- ============================================================================
-- To disable RLS:
-- ALTER TABLE patients DISABLE ROW LEVEL SECURITY;
-- DROP POLICY tenant_isolation_patients ON patients;