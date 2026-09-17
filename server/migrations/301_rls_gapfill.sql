-- ============================================================================
-- 301_rls_gapfill.sql
-- WOLF HMS - Phase 2: Security Depth & Multi-Tenant RLS Completion
-- Extends PostgreSQL Row Level Security (RLS) to all 95 remaining multi-tenant tables
-- ============================================================================

-- Ensure helper function exists (idempotent)
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS INTEGER AS $$
BEGIN
    RETURN NULLIF(current_setting('app.current_tenant', true), '')::INTEGER;
EXCEPTION
    WHEN OTHERS THEN RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

BEGIN;

-- Table: access_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE access_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE access_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_access_logs ON access_logs;
        CREATE POLICY tenant_isolation_access_logs ON access_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: ai_billing_predictions
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE ai_billing_predictions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ai_billing_predictions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ai_billing_predictions ON ai_billing_predictions;
        CREATE POLICY tenant_isolation_ai_billing_predictions ON ai_billing_predictions FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: anaesthesia_charts
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE anaesthesia_charts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE anaesthesia_charts FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_anaesthesia_charts ON anaesthesia_charts;
        CREATE POLICY tenant_isolation_anaesthesia_charts ON anaesthesia_charts FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: app_build_history
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE app_build_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE app_build_history FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_app_build_history ON app_build_history;
        CREATE POLICY tenant_isolation_app_build_history ON app_build_history FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: article_bookmarks
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE article_bookmarks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE article_bookmarks FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_article_bookmarks ON article_bookmarks;
        CREATE POLICY tenant_isolation_article_bookmarks ON article_bookmarks FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: billing_kpis
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE billing_kpis ENABLE ROW LEVEL SECURITY;
        ALTER TABLE billing_kpis FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_billing_kpis ON billing_kpis;
        CREATE POLICY tenant_isolation_billing_kpis ON billing_kpis FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: blood_donation_campaigns
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE blood_donation_campaigns ENABLE ROW LEVEL SECURITY;
        ALTER TABLE blood_donation_campaigns FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_blood_donation_campaigns ON blood_donation_campaigns;
        CREATE POLICY tenant_isolation_blood_donation_campaigns ON blood_donation_campaigns FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: blood_storage_equipment
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE blood_storage_equipment ENABLE ROW LEVEL SECURITY;
        ALTER TABLE blood_storage_equipment FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_blood_storage_equipment ON blood_storage_equipment;
        CREATE POLICY tenant_isolation_blood_storage_equipment ON blood_storage_equipment FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: blood_temperature_log
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE blood_temperature_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE blood_temperature_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_blood_temperature_log ON blood_temperature_log;
        CREATE POLICY tenant_isolation_blood_temperature_log ON blood_temperature_log FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: chemo_cycles
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE chemo_cycles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE chemo_cycles FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_chemo_cycles ON chemo_cycles;
        CREATE POLICY tenant_isolation_chemo_cycles ON chemo_cycles FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: chemo_sessions
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE chemo_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE chemo_sessions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_chemo_sessions ON chemo_sessions;
        CREATE POLICY tenant_isolation_chemo_sessions ON chemo_sessions FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: claim_denials
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE claim_denials ENABLE ROW LEVEL SECURITY;
        ALTER TABLE claim_denials FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_claim_denials ON claim_denials;
        CREATE POLICY tenant_isolation_claim_denials ON claim_denials FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: clinical_history
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE clinical_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE clinical_history FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_clinical_history ON clinical_history;
        CREATE POLICY tenant_isolation_clinical_history ON clinical_history FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: clinical_tasks
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE clinical_tasks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE clinical_tasks FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_clinical_tasks ON clinical_tasks;
        CREATE POLICY tenant_isolation_clinical_tasks ON clinical_tasks FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: clinical_vitals
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE clinical_vitals ENABLE ROW LEVEL SECURITY;
        ALTER TABLE clinical_vitals FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_clinical_vitals ON clinical_vitals;
        CREATE POLICY tenant_isolation_clinical_vitals ON clinical_vitals FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: collections_worklist
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE collections_worklist ENABLE ROW LEVEL SECURITY;
        ALTER TABLE collections_worklist FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_collections_worklist ON collections_worklist;
        CREATE POLICY tenant_isolation_collections_worklist ON collections_worklist FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: consumable_usage
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE consumable_usage ENABLE ROW LEVEL SECURITY;
        ALTER TABLE consumable_usage FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_consumable_usage ON consumable_usage;
        CREATE POLICY tenant_isolation_consumable_usage ON consumable_usage FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: cssd_trays
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE cssd_trays ENABLE ROW LEVEL SECURITY;
        ALTER TABLE cssd_trays FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_cssd_trays ON cssd_trays;
        CREATE POLICY tenant_isolation_cssd_trays ON cssd_trays FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: data_anonymization_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE data_anonymization_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE data_anonymization_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_data_anonymization_logs ON data_anonymization_logs;
        CREATE POLICY tenant_isolation_data_anonymization_logs ON data_anonymization_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: dispense_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE dispense_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE dispense_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_dispense_logs ON dispense_logs;
        CREATE POLICY tenant_isolation_dispense_logs ON dispense_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: doctor_slots
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE doctor_slots ENABLE ROW LEVEL SECURITY;
        ALTER TABLE doctor_slots FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_doctor_slots ON doctor_slots;
        CREATE POLICY tenant_isolation_doctor_slots ON doctor_slots FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: drug_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE drug_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE drug_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_drug_logs ON drug_logs;
        CREATE POLICY tenant_isolation_drug_logs ON drug_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: eligibility_checks
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE eligibility_checks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE eligibility_checks FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_eligibility_checks ON eligibility_checks;
        CREATE POLICY tenant_isolation_eligibility_checks ON eligibility_checks FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: emergency_events
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE emergency_events ENABLE ROW LEVEL SECURITY;
        ALTER TABLE emergency_events FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_emergency_events ON emergency_events;
        CREATE POLICY tenant_isolation_emergency_events ON emergency_events FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: emergency_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE emergency_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE emergency_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_emergency_logs ON emergency_logs;
        CREATE POLICY tenant_isolation_emergency_logs ON emergency_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: emergency_status
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE emergency_status ENABLE ROW LEVEL SECURITY;
        ALTER TABLE emergency_status FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_emergency_status ON emergency_status;
        CREATE POLICY tenant_isolation_emergency_status ON emergency_status FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: equipment_billing
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_billing ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_billing FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_billing ON equipment_billing;
        CREATE POLICY tenant_isolation_equipment_billing ON equipment_billing FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: equipment_inventory
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_inventory ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_inventory FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_inventory ON equipment_inventory;
        CREATE POLICY tenant_isolation_equipment_inventory ON equipment_inventory FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: equipment_requests
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_requests ON equipment_requests;
        CREATE POLICY tenant_isolation_equipment_requests ON equipment_requests FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: floor_plans
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE floor_plans ENABLE ROW LEVEL SECURITY;
        ALTER TABLE floor_plans FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_floor_plans ON floor_plans;
        CREATE POLICY tenant_isolation_floor_plans ON floor_plans FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: floor_zones
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE floor_zones ENABLE ROW LEVEL SECURITY;
        ALTER TABLE floor_zones FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_floor_zones ON floor_zones;
        CREATE POLICY tenant_isolation_floor_zones ON floor_zones FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: guard_locations
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE guard_locations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE guard_locations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_guard_locations ON guard_locations;
        CREATE POLICY tenant_isolation_guard_locations ON guard_locations FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: guard_shifts
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE guard_shifts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE guard_shifts FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_guard_shifts ON guard_shifts;
        CREATE POLICY tenant_isolation_guard_shifts ON guard_shifts FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: housekeeping_tasks
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE housekeeping_tasks FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_housekeeping_tasks ON housekeeping_tasks;
        CREATE POLICY tenant_isolation_housekeeping_tasks ON housekeeping_tasks FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: instrument_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE instrument_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE instrument_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_instrument_logs ON instrument_logs;
        CREATE POLICY tenant_isolation_instrument_logs ON instrument_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: instrument_stats
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE instrument_stats ENABLE ROW LEVEL SECURITY;
        ALTER TABLE instrument_stats FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_instrument_stats ON instrument_stats;
        CREATE POLICY tenant_isolation_instrument_stats ON instrument_stats FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: insurance_preauth
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE insurance_preauth ENABLE ROW LEVEL SECURITY;
        ALTER TABLE insurance_preauth FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_insurance_preauth ON insurance_preauth;
        CREATE POLICY tenant_isolation_insurance_preauth ON insurance_preauth FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: insurance_providers
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE insurance_providers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE insurance_providers FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_insurance_providers ON insurance_providers;
        CREATE POLICY tenant_isolation_insurance_providers ON insurance_providers FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: invoice_payments
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE invoice_payments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_invoice_payments ON invoice_payments;
        CREATE POLICY tenant_isolation_invoice_payments ON invoice_payments FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_critical_values
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_critical_values ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_critical_values FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_critical_values ON lab_critical_values;
        CREATE POLICY tenant_isolation_lab_critical_values ON lab_critical_values FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_instruments
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_instruments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_instruments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_instruments ON lab_instruments;
        CREATE POLICY tenant_isolation_lab_instruments ON lab_instruments FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_parameter_mappings
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_parameter_mappings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_parameter_mappings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_parameter_mappings ON lab_parameter_mappings;
        CREATE POLICY tenant_isolation_lab_parameter_mappings ON lab_parameter_mappings FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_parameters
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_parameters ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_parameters FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_parameters ON lab_parameters;
        CREATE POLICY tenant_isolation_lab_parameters ON lab_parameters FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_payments
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_payments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_payments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_payments ON lab_payments;
        CREATE POLICY tenant_isolation_lab_payments ON lab_payments FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_public_reports
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_public_reports ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_public_reports FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_public_reports ON lab_public_reports;
        CREATE POLICY tenant_isolation_lab_public_reports ON lab_public_reports FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_request_tests
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_request_tests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_request_tests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_request_tests ON lab_request_tests;
        CREATE POLICY tenant_isolation_lab_request_tests ON lab_request_tests FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_revenue_log
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_revenue_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_revenue_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_revenue_log ON lab_revenue_log;
        CREATE POLICY tenant_isolation_lab_revenue_log ON lab_revenue_log FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: lab_tat_log
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_tat_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_tat_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_tat_log ON lab_tat_log;
        CREATE POLICY tenant_isolation_lab_tat_log ON lab_tat_log FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: master_identities
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE master_identities ENABLE ROW LEVEL SECURITY;
        ALTER TABLE master_identities FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_master_identities ON master_identities;
        CREATE POLICY tenant_isolation_master_identities ON master_identities FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: medication_administration
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE medication_administration ENABLE ROW LEVEL SECURITY;
        ALTER TABLE medication_administration FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_medication_administration ON medication_administration;
        CREATE POLICY tenant_isolation_medication_administration ON medication_administration FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: nurse_care_tasks
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE nurse_care_tasks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE nurse_care_tasks FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_nurse_care_tasks ON nurse_care_tasks;
        CREATE POLICY tenant_isolation_nurse_care_tasks ON nurse_care_tasks FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: oncology_staging
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE oncology_staging ENABLE ROW LEVEL SECURITY;
        ALTER TABLE oncology_staging FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_oncology_staging ON oncology_staging;
        CREATE POLICY tenant_isolation_oncology_staging ON oncology_staging FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: ot_schedules
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE ot_schedules ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ot_schedules FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ot_schedules ON ot_schedules;
        CREATE POLICY tenant_isolation_ot_schedules ON ot_schedules FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pac_assessments
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pac_assessments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pac_assessments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pac_assessments ON pac_assessments;
        CREATE POLICY tenant_isolation_pac_assessments ON pac_assessments FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: package_extras
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE package_extras ENABLE ROW LEVEL SECURITY;
        ALTER TABLE package_extras FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_package_extras ON package_extras;
        CREATE POLICY tenant_isolation_package_extras ON package_extras FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: package_items
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE package_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE package_items FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_package_items ON package_items;
        CREATE POLICY tenant_isolation_package_items ON package_items FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pacu_records
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pacu_records ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pacu_records FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pacu_records ON pacu_records;
        CREATE POLICY tenant_isolation_pacu_records ON pacu_records FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pain_assessments
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pain_assessments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pain_assessments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pain_assessments ON pain_assessments;
        CREATE POLICY tenant_isolation_pain_assessments ON pain_assessments FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: patient_documents
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_documents FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_patient_documents ON patient_documents;
        CREATE POLICY tenant_isolation_patient_documents ON patient_documents FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: patient_history
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE patient_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_history FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_patient_history ON patient_history;
        CREATE POLICY tenant_isolation_patient_history ON patient_history FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: patient_insurance
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE patient_insurance ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_insurance FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_patient_insurance ON patient_insurance;
        CREATE POLICY tenant_isolation_patient_insurance ON patient_insurance FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: patient_packages
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE patient_packages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_packages FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_patient_packages ON patient_packages;
        CREATE POLICY tenant_isolation_patient_packages ON patient_packages FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: payer_profiles
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE payer_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE payer_profiles FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_payer_profiles ON payer_profiles;
        CREATE POLICY tenant_isolation_payer_profiles ON payer_profiles FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pharmacy_order_items
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pharmacy_order_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pharmacy_order_items FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pharmacy_order_items ON pharmacy_order_items;
        CREATE POLICY tenant_isolation_pharmacy_order_items ON pharmacy_order_items FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pharmacy_orders
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pharmacy_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pharmacy_orders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pharmacy_orders ON pharmacy_orders;
        CREATE POLICY tenant_isolation_pharmacy_orders ON pharmacy_orders FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pharmacy_price_requests
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pharmacy_price_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pharmacy_price_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pharmacy_price_requests ON pharmacy_price_requests;
        CREATE POLICY tenant_isolation_pharmacy_price_requests ON pharmacy_price_requests FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: platform_audit_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE platform_audit_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE platform_audit_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_platform_audit_logs ON platform_audit_logs;
        CREATE POLICY tenant_isolation_platform_audit_logs ON platform_audit_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pmjay_beneficiaries
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pmjay_beneficiaries ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pmjay_beneficiaries FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pmjay_beneficiaries ON pmjay_beneficiaries;
        CREATE POLICY tenant_isolation_pmjay_beneficiaries ON pmjay_beneficiaries FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pmjay_packages
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pmjay_packages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pmjay_packages FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pmjay_packages ON pmjay_packages;
        CREATE POLICY tenant_isolation_pmjay_packages ON pmjay_packages FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pos_activity_log
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pos_activity_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pos_activity_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pos_activity_log ON pos_activity_log;
        CREATE POLICY tenant_isolation_pos_activity_log ON pos_activity_log FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pos_credentials
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pos_credentials ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pos_credentials FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pos_credentials ON pos_credentials;
        CREATE POLICY tenant_isolation_pos_credentials ON pos_credentials FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pos_devices
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pos_devices ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pos_devices FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pos_devices ON pos_devices;
        CREATE POLICY tenant_isolation_pos_devices ON pos_devices FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pos_providers
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pos_providers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pos_providers FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pos_providers ON pos_providers;
        CREATE POLICY tenant_isolation_pos_providers ON pos_providers FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pos_refunds
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pos_refunds ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pos_refunds FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pos_refunds ON pos_refunds;
        CREATE POLICY tenant_isolation_pos_refunds ON pos_refunds FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: pos_settlements
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE pos_settlements ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pos_settlements FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pos_settlements ON pos_settlements;
        CREATE POLICY tenant_isolation_pos_settlements ON pos_settlements FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: preauth_requests
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE preauth_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE preauth_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_preauth_requests ON preauth_requests;
        CREATE POLICY tenant_isolation_preauth_requests ON preauth_requests FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: purchase_order_items
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE purchase_order_items FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_purchase_order_items ON purchase_order_items;
        CREATE POLICY tenant_isolation_purchase_order_items ON purchase_order_items FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: review_helpful
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE review_helpful ENABLE ROW LEVEL SECURITY;
        ALTER TABLE review_helpful FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_review_helpful ON review_helpful;
        CREATE POLICY tenant_isolation_review_helpful ON review_helpful FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: safety_counts
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE safety_counts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE safety_counts FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_safety_counts ON safety_counts;
        CREATE POLICY tenant_isolation_safety_counts ON safety_counts FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: security_geofences
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE security_geofences ENABLE ROW LEVEL SECURITY;
        ALTER TABLE security_geofences FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_security_geofences ON security_geofences;
        CREATE POLICY tenant_isolation_security_geofences ON security_geofences FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: security_patrols
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE security_patrols ENABLE ROW LEVEL SECURITY;
        ALTER TABLE security_patrols FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_security_patrols ON security_patrols;
        CREATE POLICY tenant_isolation_security_patrols ON security_patrols FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: security_visitors
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE security_visitors ENABLE ROW LEVEL SECURITY;
        ALTER TABLE security_visitors FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_security_visitors ON security_visitors;
        CREATE POLICY tenant_isolation_security_visitors ON security_visitors FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: sensor_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE sensor_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sensor_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_sensor_logs ON sensor_logs;
        CREATE POLICY tenant_isolation_sensor_logs ON sensor_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: shift_handovers
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE shift_handovers FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_shift_handovers ON shift_handovers;
        CREATE POLICY tenant_isolation_shift_handovers ON shift_handovers FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: sterilization_cycles
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE sterilization_cycles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sterilization_cycles FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_sterilization_cycles ON sterilization_cycles;
        CREATE POLICY tenant_isolation_sterilization_cycles ON sterilization_cycles FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: system_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE system_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE system_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_system_logs ON system_logs;
        CREATE POLICY tenant_isolation_system_logs ON system_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: system_settings
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE system_settings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_system_settings ON system_settings;
        CREATE POLICY tenant_isolation_system_settings ON system_settings FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: tpa_activity_log
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE tpa_activity_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE tpa_activity_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_tpa_activity_log ON tpa_activity_log;
        CREATE POLICY tenant_isolation_tpa_activity_log ON tpa_activity_log FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: tpa_credentials
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE tpa_credentials ENABLE ROW LEVEL SECURITY;
        ALTER TABLE tpa_credentials FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_tpa_credentials ON tpa_credentials;
        CREATE POLICY tenant_isolation_tpa_credentials ON tpa_credentials FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: tpa_providers
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE tpa_providers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE tpa_providers FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_tpa_providers ON tpa_providers;
        CREATE POLICY tenant_isolation_tpa_providers ON tpa_providers FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: vital_logs
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE vital_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE vital_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_vital_logs ON vital_logs;
        CREATE POLICY tenant_isolation_vital_logs ON vital_logs FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: vitals
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE vitals ENABLE ROW LEVEL SECURITY;
        ALTER TABLE vitals FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_vitals ON vitals;
        CREATE POLICY tenant_isolation_vitals ON vitals FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: ward_charges
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE ward_charges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ward_charges FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ward_charges ON ward_charges;
        CREATE POLICY tenant_isolation_ward_charges ON ward_charges FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: ward_requests
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE ward_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ward_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ward_requests ON ward_requests;
        CREATE POLICY tenant_isolation_ward_requests ON ward_requests FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

-- Table: webhook_deliveries
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '' AND column_name = 'hospital_id') THEN
        ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
        ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_webhook_deliveries ON webhook_deliveries;
        CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries FOR ALL USING (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id()
            OR current_tenant_id() IS NULL
        );
    END IF;
END $$;

COMMIT;
