-- 301v3: RLS gap-fill for 151 prod tables (generated from live gap query; no txn wrapper)
-- Table: abdm_consent_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'abdm_consent_requests') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'abdm_consent_requests' AND column_name = 'hospital_id') THEN
        ALTER TABLE abdm_consent_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE abdm_consent_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_abdm_consent_requests ON abdm_consent_requests;
        CREATE POLICY tenant_isolation_abdm_consent_requests ON abdm_consent_requests FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table abdm_consent_requests: %', SQLERRM;
END $$;

-- Table: accounting_periods
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'accounting_periods') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'accounting_periods' AND column_name = 'hospital_id') THEN
        ALTER TABLE accounting_periods ENABLE ROW LEVEL SECURITY;
        ALTER TABLE accounting_periods FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_accounting_periods ON accounting_periods;
        CREATE POLICY tenant_isolation_accounting_periods ON accounting_periods FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table accounting_periods: %', SQLERRM;
END $$;

-- Table: admin_audit_log
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'admin_audit_log') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'admin_audit_log' AND column_name = 'hospital_id') THEN
        ALTER TABLE admin_audit_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE admin_audit_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_admin_audit_log ON admin_audit_log;
        CREATE POLICY tenant_isolation_admin_audit_log ON admin_audit_log FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table admin_audit_log: %', SQLERRM;
END $$;

-- Table: api_usage_stats
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'api_usage_stats') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'api_usage_stats' AND column_name = 'hospital_id') THEN
        ALTER TABLE api_usage_stats ENABLE ROW LEVEL SECURITY;
        ALTER TABLE api_usage_stats FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_api_usage_stats ON api_usage_stats;
        CREATE POLICY tenant_isolation_api_usage_stats ON api_usage_stats FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table api_usage_stats: %', SQLERRM;
END $$;

-- Table: appointments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'appointments') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'appointments' AND column_name = 'hospital_id') THEN
        ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE appointments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_appointments ON appointments;
        CREATE POLICY tenant_isolation_appointments ON appointments FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table appointments: %', SQLERRM;
END $$;

-- Table: archive_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'archive_logs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'archive_logs' AND column_name = 'hospital_id') THEN
        ALTER TABLE archive_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE archive_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_archive_logs ON archive_logs;
        CREATE POLICY tenant_isolation_archive_logs ON archive_logs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table archive_logs: %', SQLERRM;
END $$;

-- Table: article_categories
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'article_categories') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'article_categories' AND column_name = 'hospital_id') THEN
        ALTER TABLE article_categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE article_categories FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_article_categories ON article_categories;
        CREATE POLICY tenant_isolation_article_categories ON article_categories FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table article_categories: %', SQLERRM;
END $$;

-- Table: audit_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'audit_logs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'audit_logs' AND column_name = 'hospital_id') THEN
        ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
        CREATE POLICY tenant_isolation_audit_logs ON audit_logs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table audit_logs: %', SQLERRM;
END $$;

-- Table: bed_history
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bed_history') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'bed_history' AND column_name = 'hospital_id') THEN
        ALTER TABLE bed_history ENABLE ROW LEVEL SECURITY;
        ALTER TABLE bed_history FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_bed_history ON bed_history;
        CREATE POLICY tenant_isolation_bed_history ON bed_history FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table bed_history: %', SQLERRM;
END $$;

-- Table: beds
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'beds') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'beds' AND column_name = 'hospital_id') THEN
        ALTER TABLE beds ENABLE ROW LEVEL SECURITY;
        ALTER TABLE beds FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_beds ON beds;
        CREATE POLICY tenant_isolation_beds ON beds FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table beds: %', SQLERRM;
END $$;

-- Table: blood_component_types
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blood_component_types') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blood_component_types' AND column_name = 'hospital_id') THEN
        ALTER TABLE blood_component_types ENABLE ROW LEVEL SECURITY;
        ALTER TABLE blood_component_types FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_blood_component_types ON blood_component_types;
        CREATE POLICY tenant_isolation_blood_component_types ON blood_component_types FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table blood_component_types: %', SQLERRM;
END $$;

-- Table: blood_donors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blood_donors') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blood_donors' AND column_name = 'hospital_id') THEN
        ALTER TABLE blood_donors ENABLE ROW LEVEL SECURITY;
        ALTER TABLE blood_donors FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_blood_donors ON blood_donors;
        CREATE POLICY tenant_isolation_blood_donors ON blood_donors FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table blood_donors: %', SQLERRM;
END $$;

-- Table: blood_units
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'blood_units') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'blood_units' AND column_name = 'hospital_id') THEN
        ALTER TABLE blood_units ENABLE ROW LEVEL SECURITY;
        ALTER TABLE blood_units FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_blood_units ON blood_units;
        CREATE POLICY tenant_isolation_blood_units ON blood_units FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table blood_units: %', SQLERRM;
END $$;

-- Table: care_plan_templates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'care_plan_templates') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'care_plan_templates' AND column_name = 'hospital_id') THEN
        ALTER TABLE care_plan_templates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE care_plan_templates FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_care_plan_templates ON care_plan_templates;
        CREATE POLICY tenant_isolation_care_plan_templates ON care_plan_templates FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table care_plan_templates: %', SQLERRM;
END $$;

-- Table: chat_messages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_messages') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chat_messages' AND column_name = 'hospital_id') THEN
        ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE chat_messages FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_chat_messages ON chat_messages;
        CREATE POLICY tenant_isolation_chat_messages ON chat_messages FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table chat_messages: %', SQLERRM;
END $$;

-- Table: chat_quick_replies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_quick_replies') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chat_quick_replies' AND column_name = 'hospital_id') THEN
        ALTER TABLE chat_quick_replies ENABLE ROW LEVEL SECURITY;
        ALTER TABLE chat_quick_replies FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_chat_quick_replies ON chat_quick_replies;
        CREATE POLICY tenant_isolation_chat_quick_replies ON chat_quick_replies FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table chat_quick_replies: %', SQLERRM;
END $$;

-- Table: chat_threads
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'chat_threads') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'chat_threads' AND column_name = 'hospital_id') THEN
        ALTER TABLE chat_threads ENABLE ROW LEVEL SECURITY;
        ALTER TABLE chat_threads FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_chat_threads ON chat_threads;
        CREATE POLICY tenant_isolation_chat_threads ON chat_threads FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table chat_threads: %', SQLERRM;
END $$;

-- Table: claim_scrub_results
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'claim_scrub_results') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'claim_scrub_results' AND column_name = 'hospital_id') THEN
        ALTER TABLE claim_scrub_results ENABLE ROW LEVEL SECURITY;
        ALTER TABLE claim_scrub_results FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_claim_scrub_results ON claim_scrub_results;
        CREATE POLICY tenant_isolation_claim_scrub_results ON claim_scrub_results FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table claim_scrub_results: %', SQLERRM;
END $$;

-- Table: controlled_substance_log
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'controlled_substance_log') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'controlled_substance_log' AND column_name = 'hospital_id') THEN
        ALTER TABLE controlled_substance_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE controlled_substance_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_controlled_substance_log ON controlled_substance_log;
        CREATE POLICY tenant_isolation_controlled_substance_log ON controlled_substance_log FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table controlled_substance_log: %', SQLERRM;
END $$;

-- Table: cross_hospital_links
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cross_hospital_links') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cross_hospital_links' AND column_name = 'hospital_id') THEN
        ALTER TABLE cross_hospital_links ENABLE ROW LEVEL SECURITY;
        ALTER TABLE cross_hospital_links FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_cross_hospital_links ON cross_hospital_links;
        CREATE POLICY tenant_isolation_cross_hospital_links ON cross_hospital_links FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table cross_hospital_links: %', SQLERRM;
END $$;

-- Table: cssd_instruments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cssd_instruments') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cssd_instruments' AND column_name = 'hospital_id') THEN
        ALTER TABLE cssd_instruments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE cssd_instruments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_cssd_instruments ON cssd_instruments;
        CREATE POLICY tenant_isolation_cssd_instruments ON cssd_instruments FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table cssd_instruments: %', SQLERRM;
END $$;

-- Table: cssd_load_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'cssd_load_logs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'cssd_load_logs' AND column_name = 'hospital_id') THEN
        ALTER TABLE cssd_load_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE cssd_load_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_cssd_load_logs ON cssd_load_logs;
        CREATE POLICY tenant_isolation_cssd_load_logs ON cssd_load_logs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table cssd_load_logs: %', SQLERRM;
END $$;

-- Table: daily_health_tips
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'daily_health_tips') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'daily_health_tips' AND column_name = 'hospital_id') THEN
        ALTER TABLE daily_health_tips ENABLE ROW LEVEL SECURITY;
        ALTER TABLE daily_health_tips FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_daily_health_tips ON daily_health_tips;
        CREATE POLICY tenant_isolation_daily_health_tips ON daily_health_tips FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table daily_health_tips: %', SQLERRM;
END $$;

-- Table: data_retention_policy
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'data_retention_policy') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'data_retention_policy' AND column_name = 'hospital_id') THEN
        ALTER TABLE data_retention_policy ENABLE ROW LEVEL SECURITY;
        ALTER TABLE data_retention_policy FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_data_retention_policy ON data_retention_policy;
        CREATE POLICY tenant_isolation_data_retention_policy ON data_retention_policy FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table data_retention_policy: %', SQLERRM;
END $$;

-- Table: death_records
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'death_records') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'death_records' AND column_name = 'hospital_id') THEN
        ALTER TABLE death_records ENABLE ROW LEVEL SECURITY;
        ALTER TABLE death_records FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_death_records ON death_records;
        CREATE POLICY tenant_isolation_death_records ON death_records FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table death_records: %', SQLERRM;
END $$;

-- Table: delivery_staff_locations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delivery_staff_locations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delivery_staff_locations' AND column_name = 'hospital_id') THEN
        ALTER TABLE delivery_staff_locations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE delivery_staff_locations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_delivery_staff_locations ON delivery_staff_locations;
        CREATE POLICY tenant_isolation_delivery_staff_locations ON delivery_staff_locations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table delivery_staff_locations: %', SQLERRM;
END $$;

-- Table: delta_check_rules
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'delta_check_rules') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'delta_check_rules' AND column_name = 'hospital_id') THEN
        ALTER TABLE delta_check_rules ENABLE ROW LEVEL SECURITY;
        ALTER TABLE delta_check_rules FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_delta_check_rules ON delta_check_rules;
        CREATE POLICY tenant_isolation_delta_check_rules ON delta_check_rules FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table delta_check_rules: %', SQLERRM;
END $$;

-- Table: dental_inventory
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dental_inventory') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dental_inventory' AND column_name = 'hospital_id') THEN
        ALTER TABLE dental_inventory ENABLE ROW LEVEL SECURITY;
        ALTER TABLE dental_inventory FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_dental_inventory ON dental_inventory;
        CREATE POLICY tenant_isolation_dental_inventory ON dental_inventory FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table dental_inventory: %', SQLERRM;
END $$;

-- Table: dental_lab_orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dental_lab_orders') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dental_lab_orders' AND column_name = 'hospital_id') THEN
        ALTER TABLE dental_lab_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE dental_lab_orders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_dental_lab_orders ON dental_lab_orders;
        CREATE POLICY tenant_isolation_dental_lab_orders ON dental_lab_orders FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table dental_lab_orders: %', SQLERRM;
END $$;

-- Table: dental_procedures
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dental_procedures') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dental_procedures' AND column_name = 'hospital_id') THEN
        ALTER TABLE dental_procedures ENABLE ROW LEVEL SECURITY;
        ALTER TABLE dental_procedures FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_dental_procedures ON dental_procedures;
        CREATE POLICY tenant_isolation_dental_procedures ON dental_procedures FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table dental_procedures: %', SQLERRM;
END $$;

-- Table: dental_visits
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dental_visits') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dental_visits' AND column_name = 'hospital_id') THEN
        ALTER TABLE dental_visits ENABLE ROW LEVEL SECURITY;
        ALTER TABLE dental_visits FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_dental_visits ON dental_visits;
        CREATE POLICY tenant_isolation_dental_visits ON dental_visits FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table dental_visits: %', SQLERRM;
END $$;

-- Table: dietary_orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'dietary_orders') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'dietary_orders' AND column_name = 'hospital_id') THEN
        ALTER TABLE dietary_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE dietary_orders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_dietary_orders ON dietary_orders;
        CREATE POLICY tenant_isolation_dietary_orders ON dietary_orders FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table dietary_orders: %', SQLERRM;
END $$;

-- Table: doctor_payouts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doctor_payouts') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'doctor_payouts' AND column_name = 'hospital_id') THEN
        ALTER TABLE doctor_payouts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE doctor_payouts FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_doctor_payouts ON doctor_payouts;
        CREATE POLICY tenant_isolation_doctor_payouts ON doctor_payouts FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table doctor_payouts: %', SQLERRM;
END $$;

-- Table: doctor_reviews
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'doctor_reviews') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'doctor_reviews' AND column_name = 'hospital_id') THEN
        ALTER TABLE doctor_reviews ENABLE ROW LEVEL SECURITY;
        ALTER TABLE doctor_reviews FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_doctor_reviews ON doctor_reviews;
        CREATE POLICY tenant_isolation_doctor_reviews ON doctor_reviews FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table doctor_reviews: %', SQLERRM;
END $$;

-- Table: domain_verifications
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'domain_verifications') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'domain_verifications' AND column_name = 'hospital_id') THEN
        ALTER TABLE domain_verifications ENABLE ROW LEVEL SECURITY;
        ALTER TABLE domain_verifications FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_domain_verifications ON domain_verifications;
        CREATE POLICY tenant_isolation_domain_verifications ON domain_verifications FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table domain_verifications: %', SQLERRM;
END $$;

-- Table: drugs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'drugs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'drugs' AND column_name = 'hospital_id') THEN
        ALTER TABLE drugs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE drugs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_drugs ON drugs;
        CREATE POLICY tenant_isolation_drugs ON drugs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table drugs: %', SQLERRM;
END $$;

-- Table: emar_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emar_logs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'emar_logs' AND column_name = 'hospital_id') THEN
        ALTER TABLE emar_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE emar_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_emar_logs ON emar_logs;
        CREATE POLICY tenant_isolation_emar_logs ON emar_logs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table emar_logs: %', SQLERRM;
END $$;

-- Table: emergency_cases
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'emergency_cases') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'emergency_cases' AND column_name = 'hospital_id') THEN
        ALTER TABLE emergency_cases ENABLE ROW LEVEL SECURITY;
        ALTER TABLE emergency_cases FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_emergency_cases ON emergency_cases;
        CREATE POLICY tenant_isolation_emergency_cases ON emergency_cases FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table emergency_cases: %', SQLERRM;
END $$;

-- Table: equipment_amc_contracts
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_amc_contracts') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipment_amc_contracts' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_amc_contracts ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_amc_contracts FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_amc_contracts ON equipment_amc_contracts;
        CREATE POLICY tenant_isolation_equipment_amc_contracts ON equipment_amc_contracts FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table equipment_amc_contracts: %', SQLERRM;
END $$;

-- Table: equipment_assignments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_assignments') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipment_assignments' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_assignments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_assignments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_assignments ON equipment_assignments;
        CREATE POLICY tenant_isolation_equipment_assignments ON equipment_assignments FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table equipment_assignments: %', SQLERRM;
END $$;

-- Table: equipment_calibrations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_calibrations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipment_calibrations' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_calibrations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_calibrations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_calibrations ON equipment_calibrations;
        CREATE POLICY tenant_isolation_equipment_calibrations ON equipment_calibrations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table equipment_calibrations: %', SQLERRM;
END $$;

-- Table: equipment_change_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_change_requests') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipment_change_requests' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_change_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_change_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_change_requests ON equipment_change_requests;
        CREATE POLICY tenant_isolation_equipment_change_requests ON equipment_change_requests FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table equipment_change_requests: %', SQLERRM;
END $$;

-- Table: equipment_pm_schedules
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_pm_schedules') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipment_pm_schedules' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_pm_schedules ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_pm_schedules FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_pm_schedules ON equipment_pm_schedules;
        CREATE POLICY tenant_isolation_equipment_pm_schedules ON equipment_pm_schedules FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table equipment_pm_schedules: %', SQLERRM;
END $$;

-- Table: equipment_types
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'equipment_types') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'equipment_types' AND column_name = 'hospital_id') THEN
        ALTER TABLE equipment_types ENABLE ROW LEVEL SECURITY;
        ALTER TABLE equipment_types FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_equipment_types ON equipment_types;
        CREATE POLICY tenant_isolation_equipment_types ON equipment_types FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table equipment_types: %', SQLERRM;
END $$;

-- Table: exercise_library
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'exercise_library') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'exercise_library' AND column_name = 'hospital_id') THEN
        ALTER TABLE exercise_library ENABLE ROW LEVEL SECURITY;
        ALTER TABLE exercise_library FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_exercise_library ON exercise_library;
        CREATE POLICY tenant_isolation_exercise_library ON exercise_library FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table exercise_library: %', SQLERRM;
END $$;

-- Table: family_members
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'family_members') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'family_members' AND column_name = 'hospital_id') THEN
        ALTER TABLE family_members ENABLE ROW LEVEL SECURITY;
        ALTER TABLE family_members FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_family_members ON family_members;
        CREATE POLICY tenant_isolation_family_members ON family_members FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table family_members: %', SQLERRM;
END $$;

-- Table: fluid_balance
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fluid_balance') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'fluid_balance' AND column_name = 'hospital_id') THEN
        ALTER TABLE fluid_balance ENABLE ROW LEVEL SECURITY;
        ALTER TABLE fluid_balance FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_fluid_balance ON fluid_balance;
        CREATE POLICY tenant_isolation_fluid_balance ON fluid_balance FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table fluid_balance: %', SQLERRM;
END $$;

-- Table: govt_scheme_empanelment
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'govt_scheme_empanelment') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'govt_scheme_empanelment' AND column_name = 'hospital_id') THEN
        ALTER TABLE govt_scheme_empanelment ENABLE ROW LEVEL SECURITY;
        ALTER TABLE govt_scheme_empanelment FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_govt_scheme_empanelment ON govt_scheme_empanelment;
        CREATE POLICY tenant_isolation_govt_scheme_empanelment ON govt_scheme_empanelment FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table govt_scheme_empanelment: %', SQLERRM;
END $$;

-- Table: handoff_reports
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'handoff_reports') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'handoff_reports' AND column_name = 'hospital_id') THEN
        ALTER TABLE handoff_reports ENABLE ROW LEVEL SECURITY;
        ALTER TABLE handoff_reports FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_handoff_reports ON handoff_reports;
        CREATE POLICY tenant_isolation_handoff_reports ON handoff_reports FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table handoff_reports: %', SQLERRM;
END $$;

-- Table: health_articles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'health_articles') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'health_articles' AND column_name = 'hospital_id') THEN
        ALTER TABLE health_articles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE health_articles FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_health_articles ON health_articles;
        CREATE POLICY tenant_isolation_health_articles ON health_articles FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table health_articles: %', SQLERRM;
END $$;

-- Table: home_collection_slots
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'home_collection_slots') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'home_collection_slots' AND column_name = 'hospital_id') THEN
        ALTER TABLE home_collection_slots ENABLE ROW LEVEL SECURITY;
        ALTER TABLE home_collection_slots FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_home_collection_slots ON home_collection_slots;
        CREATE POLICY tenant_isolation_home_collection_slots ON home_collection_slots FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table home_collection_slots: %', SQLERRM;
END $$;

-- Table: hospital_admins
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_admins') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_admins' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_admins ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_admins FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_admins ON hospital_admins;
        CREATE POLICY tenant_isolation_hospital_admins ON hospital_admins FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_admins: %', SQLERRM;
END $$;

-- Table: hospital_app_builds
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_app_builds') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_app_builds' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_app_builds ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_app_builds FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_app_builds ON hospital_app_builds;
        CREATE POLICY tenant_isolation_hospital_app_builds ON hospital_app_builds FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_app_builds: %', SQLERRM;
END $$;

-- Table: hospital_assets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_assets') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_assets' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_assets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_assets FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_assets ON hospital_assets;
        CREATE POLICY tenant_isolation_hospital_assets ON hospital_assets FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_assets: %', SQLERRM;
END $$;

-- Table: hospital_audit_log
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_audit_log') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_audit_log' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_audit_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_audit_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_audit_log ON hospital_audit_log;
        CREATE POLICY tenant_isolation_hospital_audit_log ON hospital_audit_log FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_audit_log: %', SQLERRM;
END $$;

-- Table: hospital_branding
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_branding') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_branding' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_branding ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_branding FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_branding ON hospital_branding;
        CREATE POLICY tenant_isolation_hospital_branding ON hospital_branding FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_branding: %', SQLERRM;
END $$;

-- Table: hospital_buildings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_buildings') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_buildings' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_buildings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_buildings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_buildings ON hospital_buildings;
        CREATE POLICY tenant_isolation_hospital_buildings ON hospital_buildings FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_buildings: %', SQLERRM;
END $$;

-- Table: hospital_delivery_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_delivery_settings') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_delivery_settings' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_delivery_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_delivery_settings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_delivery_settings ON hospital_delivery_settings;
        CREATE POLICY tenant_isolation_hospital_delivery_settings ON hospital_delivery_settings FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_delivery_settings: %', SQLERRM;
END $$;

-- Table: hospital_refund_policies
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_refund_policies') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_refund_policies' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_refund_policies ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_refund_policies FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_refund_policies ON hospital_refund_policies;
        CREATE POLICY tenant_isolation_hospital_refund_policies ON hospital_refund_policies FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_refund_policies: %', SQLERRM;
END $$;

-- Table: hospital_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'hospital_settings') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'hospital_settings' AND column_name = 'hospital_id') THEN
        ALTER TABLE hospital_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE hospital_settings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_hospital_settings ON hospital_settings;
        CREATE POLICY tenant_isolation_hospital_settings ON hospital_settings FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table hospital_settings: %', SQLERRM;
END $$;

-- Table: icu_fluid_io_charting
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'icu_fluid_io_charting') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'icu_fluid_io_charting' AND column_name = 'hospital_id') THEN
        ALTER TABLE icu_fluid_io_charting ENABLE ROW LEVEL SECURITY;
        ALTER TABLE icu_fluid_io_charting FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_icu_fluid_io_charting ON icu_fluid_io_charting;
        CREATE POLICY tenant_isolation_icu_fluid_io_charting ON icu_fluid_io_charting FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table icu_fluid_io_charting: %', SQLERRM;
END $$;

-- Table: icu_ventilator_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'icu_ventilator_logs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'icu_ventilator_logs' AND column_name = 'hospital_id') THEN
        ALTER TABLE icu_ventilator_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE icu_ventilator_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_icu_ventilator_logs ON icu_ventilator_logs;
        CREATE POLICY tenant_isolation_icu_ventilator_logs ON icu_ventilator_logs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table icu_ventilator_logs: %', SQLERRM;
END $$;

-- Table: instrument_calibrations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instrument_calibrations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instrument_calibrations' AND column_name = 'hospital_id') THEN
        ALTER TABLE instrument_calibrations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE instrument_calibrations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_instrument_calibrations ON instrument_calibrations;
        CREATE POLICY tenant_isolation_instrument_calibrations ON instrument_calibrations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table instrument_calibrations: %', SQLERRM;
END $$;

-- Table: instrument_test_mapping
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'instrument_test_mapping') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'instrument_test_mapping' AND column_name = 'hospital_id') THEN
        ALTER TABLE instrument_test_mapping ENABLE ROW LEVEL SECURITY;
        ALTER TABLE instrument_test_mapping FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_instrument_test_mapping ON instrument_test_mapping;
        CREATE POLICY tenant_isolation_instrument_test_mapping ON instrument_test_mapping FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table instrument_test_mapping: %', SQLERRM;
END $$;

-- Table: insurance_claims
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'insurance_claims') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'insurance_claims' AND column_name = 'hospital_id') THEN
        ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
        ALTER TABLE insurance_claims FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_insurance_claims ON insurance_claims;
        CREATE POLICY tenant_isolation_insurance_claims ON insurance_claims FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table insurance_claims: %', SQLERRM;
END $$;

-- Table: inventory
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inventory') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'inventory' AND column_name = 'hospital_id') THEN
        ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
        ALTER TABLE inventory FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_inventory ON inventory;
        CREATE POLICY tenant_isolation_inventory ON inventory FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table inventory: %', SQLERRM;
END $$;

-- Table: invoice_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoice_items') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoice_items' AND column_name = 'hospital_id') THEN
        ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE invoice_items FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_invoice_items ON invoice_items;
        CREATE POLICY tenant_isolation_invoice_items ON invoice_items FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table invoice_items: %', SQLERRM;
END $$;

-- Table: invoices
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'invoices') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'hospital_id') THEN
        ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
        ALTER TABLE invoices FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_invoices ON invoices;
        CREATE POLICY tenant_isolation_invoices ON invoices FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table invoices: %', SQLERRM;
END $$;

-- Table: iv_lines
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'iv_lines') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'iv_lines' AND column_name = 'hospital_id') THEN
        ALTER TABLE iv_lines ENABLE ROW LEVEL SECURITY;
        ALTER TABLE iv_lines FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_iv_lines ON iv_lines;
        CREATE POLICY tenant_isolation_iv_lines ON iv_lines FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table iv_lines: %', SQLERRM;
END $$;

-- Table: lab_audit_log
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_audit_log') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_audit_log' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_audit_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_audit_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_audit_log ON lab_audit_log;
        CREATE POLICY tenant_isolation_lab_audit_log ON lab_audit_log FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_audit_log: %', SQLERRM;
END $$;

-- Table: lab_audit_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_audit_logs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_audit_logs' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_audit_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_audit_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_audit_logs ON lab_audit_logs;
        CREATE POLICY tenant_isolation_lab_audit_logs ON lab_audit_logs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_audit_logs: %', SQLERRM;
END $$;

-- Table: lab_change_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_change_requests') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_change_requests' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_change_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_change_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_change_requests ON lab_change_requests;
        CREATE POLICY tenant_isolation_lab_change_requests ON lab_change_requests FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_change_requests: %', SQLERRM;
END $$;

-- Table: lab_package_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_package_items') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_package_items' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_package_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_package_items FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_package_items ON lab_package_items;
        CREATE POLICY tenant_isolation_lab_package_items ON lab_package_items FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_package_items: %', SQLERRM;
END $$;

-- Table: lab_packages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_packages') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_packages' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_packages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_packages FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_packages ON lab_packages;
        CREATE POLICY tenant_isolation_lab_packages ON lab_packages FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_packages: %', SQLERRM;
END $$;

-- Table: lab_qc_materials
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_qc_materials') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_qc_materials' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_qc_materials ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_qc_materials FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_qc_materials ON lab_qc_materials;
        CREATE POLICY tenant_isolation_lab_qc_materials ON lab_qc_materials FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_qc_materials: %', SQLERRM;
END $$;

-- Table: lab_qc_results
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_qc_results') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_qc_results' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_qc_results ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_qc_results FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_qc_results ON lab_qc_results;
        CREATE POLICY tenant_isolation_lab_qc_results ON lab_qc_results FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_qc_results: %', SQLERRM;
END $$;

-- Table: lab_qc_violations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_qc_violations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_qc_violations' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_qc_violations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_qc_violations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_qc_violations ON lab_qc_violations;
        CREATE POLICY tenant_isolation_lab_qc_violations ON lab_qc_violations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_qc_violations: %', SQLERRM;
END $$;

-- Table: lab_reagents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_reagents') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_reagents' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_reagents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_reagents FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_reagents ON lab_reagents;
        CREATE POLICY tenant_isolation_lab_reagents ON lab_reagents FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_reagents: %', SQLERRM;
END $$;

-- Table: lab_reference_ranges
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_reference_ranges') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_reference_ranges' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_reference_ranges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_reference_ranges FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_reference_ranges ON lab_reference_ranges;
        CREATE POLICY tenant_isolation_lab_reference_ranges ON lab_reference_ranges FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_reference_ranges: %', SQLERRM;
END $$;

-- Table: lab_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_requests') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_requests' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_requests ON lab_requests;
        CREATE POLICY tenant_isolation_lab_requests ON lab_requests FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_requests: %', SQLERRM;
END $$;

-- Table: lab_result_versions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_result_versions') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_result_versions' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_result_versions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_result_versions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_result_versions ON lab_result_versions;
        CREATE POLICY tenant_isolation_lab_result_versions ON lab_result_versions FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_result_versions: %', SQLERRM;
END $$;

-- Table: lab_test_categories
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_test_categories') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_test_categories' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_test_categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_test_categories FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_test_categories ON lab_test_categories;
        CREATE POLICY tenant_isolation_lab_test_categories ON lab_test_categories FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_test_categories: %', SQLERRM;
END $$;

-- Table: lab_test_packages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_test_packages') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_test_packages' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_test_packages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_test_packages FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_test_packages ON lab_test_packages;
        CREATE POLICY tenant_isolation_lab_test_packages ON lab_test_packages FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_test_packages: %', SQLERRM;
END $$;

-- Table: lab_test_types
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_test_types') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_test_types' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_test_types ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_test_types FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_test_types ON lab_test_types;
        CREATE POLICY tenant_isolation_lab_test_types ON lab_test_types FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_test_types: %', SQLERRM;
END $$;

-- Table: lab_tests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'lab_tests') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lab_tests' AND column_name = 'hospital_id') THEN
        ALTER TABLE lab_tests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE lab_tests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_lab_tests ON lab_tests;
        CREATE POLICY tenant_isolation_lab_tests ON lab_tests FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table lab_tests: %', SQLERRM;
END $$;

-- Table: login_audit_log
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'login_audit_log') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'login_audit_log' AND column_name = 'hospital_id') THEN
        ALTER TABLE login_audit_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE login_audit_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_login_audit_log ON login_audit_log;
        CREATE POLICY tenant_isolation_login_audit_log ON login_audit_log FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table login_audit_log: %', SQLERRM;
END $$;

-- Table: maternity_antenatal_profiles
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maternity_antenatal_profiles') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maternity_antenatal_profiles' AND column_name = 'hospital_id') THEN
        ALTER TABLE maternity_antenatal_profiles ENABLE ROW LEVEL SECURITY;
        ALTER TABLE maternity_antenatal_profiles FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_maternity_antenatal_profiles ON maternity_antenatal_profiles;
        CREATE POLICY tenant_isolation_maternity_antenatal_profiles ON maternity_antenatal_profiles FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table maternity_antenatal_profiles: %', SQLERRM;
END $$;

-- Table: maternity_delivery_registry
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maternity_delivery_registry') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maternity_delivery_registry' AND column_name = 'hospital_id') THEN
        ALTER TABLE maternity_delivery_registry ENABLE ROW LEVEL SECURITY;
        ALTER TABLE maternity_delivery_registry FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_maternity_delivery_registry ON maternity_delivery_registry;
        CREATE POLICY tenant_isolation_maternity_delivery_registry ON maternity_delivery_registry FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table maternity_delivery_registry: %', SQLERRM;
END $$;

-- Table: maternity_labor_partographs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'maternity_labor_partographs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'maternity_labor_partographs' AND column_name = 'hospital_id') THEN
        ALTER TABLE maternity_labor_partographs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE maternity_labor_partographs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_maternity_labor_partographs ON maternity_labor_partographs;
        CREATE POLICY tenant_isolation_maternity_labor_partographs ON maternity_labor_partographs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table maternity_labor_partographs: %', SQLERRM;
END $$;

-- Table: medicine_orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'medicine_orders') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'medicine_orders' AND column_name = 'hospital_id') THEN
        ALTER TABLE medicine_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE medicine_orders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_medicine_orders ON medicine_orders;
        CREATE POLICY tenant_isolation_medicine_orders ON medicine_orders FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table medicine_orders: %', SQLERRM;
END $$;

-- Table: migration_jobs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'migration_jobs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'migration_jobs' AND column_name = 'hospital_id') THEN
        ALTER TABLE migration_jobs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE migration_jobs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_migration_jobs ON migration_jobs;
        CREATE POLICY tenant_isolation_migration_jobs ON migration_jobs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table migration_jobs: %', SQLERRM;
END $$;

-- Table: mortuary_chambers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'mortuary_chambers') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'mortuary_chambers' AND column_name = 'hospital_id') THEN
        ALTER TABLE mortuary_chambers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE mortuary_chambers FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_mortuary_chambers ON mortuary_chambers;
        CREATE POLICY tenant_isolation_mortuary_chambers ON mortuary_chambers FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table mortuary_chambers: %', SQLERRM;
END $$;

-- Table: notification_logs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_logs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_logs' AND column_name = 'hospital_id') THEN
        ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notification_logs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_notification_logs ON notification_logs;
        CREATE POLICY tenant_isolation_notification_logs ON notification_logs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table notification_logs: %', SQLERRM;
END $$;

-- Table: notification_preferences
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'notification_preferences') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'notification_preferences' AND column_name = 'hospital_id') THEN
        ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
        ALTER TABLE notification_preferences FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_notification_preferences ON notification_preferences;
        CREATE POLICY tenant_isolation_notification_preferences ON notification_preferences FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table notification_preferences: %', SQLERRM;
END $$;

-- Table: nurse_assignments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nurse_assignments') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nurse_assignments' AND column_name = 'hospital_id') THEN
        ALTER TABLE nurse_assignments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE nurse_assignments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_nurse_assignments ON nurse_assignments;
        CREATE POLICY tenant_isolation_nurse_assignments ON nurse_assignments FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table nurse_assignments: %', SQLERRM;
END $$;

-- Table: nursing_care_plans
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'nursing_care_plans') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'nursing_care_plans' AND column_name = 'hospital_id') THEN
        ALTER TABLE nursing_care_plans ENABLE ROW LEVEL SECURITY;
        ALTER TABLE nursing_care_plans FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_nursing_care_plans ON nursing_care_plans;
        CREATE POLICY tenant_isolation_nursing_care_plans ON nursing_care_plans FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table nursing_care_plans: %', SQLERRM;
END $$;

-- Table: opd_queue
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'opd_queue') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'opd_queue' AND column_name = 'hospital_id') THEN
        ALTER TABLE opd_queue ENABLE ROW LEVEL SECURITY;
        ALTER TABLE opd_queue FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_opd_queue ON opd_queue;
        CREATE POLICY tenant_isolation_opd_queue ON opd_queue FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table opd_queue: %', SQLERRM;
END $$;

-- Table: ophthalmology_biometry
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ophthalmology_biometry') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ophthalmology_biometry' AND column_name = 'hospital_id') THEN
        ALTER TABLE ophthalmology_biometry ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ophthalmology_biometry FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ophthalmology_biometry ON ophthalmology_biometry;
        CREATE POLICY tenant_isolation_ophthalmology_biometry ON ophthalmology_biometry FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ophthalmology_biometry: %', SQLERRM;
END $$;

-- Table: ophthalmology_inventory
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ophthalmology_inventory') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ophthalmology_inventory' AND column_name = 'hospital_id') THEN
        ALTER TABLE ophthalmology_inventory ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ophthalmology_inventory FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ophthalmology_inventory ON ophthalmology_inventory;
        CREATE POLICY tenant_isolation_ophthalmology_inventory ON ophthalmology_inventory FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ophthalmology_inventory: %', SQLERRM;
END $$;

-- Table: ophthalmology_procedures
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ophthalmology_procedures') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ophthalmology_procedures' AND column_name = 'hospital_id') THEN
        ALTER TABLE ophthalmology_procedures ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ophthalmology_procedures FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ophthalmology_procedures ON ophthalmology_procedures;
        CREATE POLICY tenant_isolation_ophthalmology_procedures ON ophthalmology_procedures FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ophthalmology_procedures: %', SQLERRM;
END $$;

-- Table: ophthalmology_visits
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ophthalmology_visits') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ophthalmology_visits' AND column_name = 'hospital_id') THEN
        ALTER TABLE ophthalmology_visits ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ophthalmology_visits FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ophthalmology_visits ON ophthalmology_visits;
        CREATE POLICY tenant_isolation_ophthalmology_visits ON ophthalmology_visits FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ophthalmology_visits: %', SQLERRM;
END $$;

-- Table: order_sets
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'order_sets') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'order_sets' AND column_name = 'hospital_id') THEN
        ALTER TABLE order_sets ENABLE ROW LEVEL SECURITY;
        ALTER TABLE order_sets FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_order_sets ON order_sets;
        CREATE POLICY tenant_isolation_order_sets ON order_sets FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table order_sets: %', SQLERRM;
END $$;

-- Table: orthopedic_implants
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orthopedic_implants') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orthopedic_implants' AND column_name = 'hospital_id') THEN
        ALTER TABLE orthopedic_implants ENABLE ROW LEVEL SECURITY;
        ALTER TABLE orthopedic_implants FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_orthopedic_implants ON orthopedic_implants;
        CREATE POLICY tenant_isolation_orthopedic_implants ON orthopedic_implants FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table orthopedic_implants: %', SQLERRM;
END $$;

-- Table: orthopedic_physio_orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orthopedic_physio_orders') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orthopedic_physio_orders' AND column_name = 'hospital_id') THEN
        ALTER TABLE orthopedic_physio_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE orthopedic_physio_orders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_orthopedic_physio_orders ON orthopedic_physio_orders;
        CREATE POLICY tenant_isolation_orthopedic_physio_orders ON orthopedic_physio_orders FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table orthopedic_physio_orders: %', SQLERRM;
END $$;

-- Table: orthopedic_procedures
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orthopedic_procedures') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orthopedic_procedures' AND column_name = 'hospital_id') THEN
        ALTER TABLE orthopedic_procedures ENABLE ROW LEVEL SECURITY;
        ALTER TABLE orthopedic_procedures FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_orthopedic_procedures ON orthopedic_procedures;
        CREATE POLICY tenant_isolation_orthopedic_procedures ON orthopedic_procedures FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table orthopedic_procedures: %', SQLERRM;
END $$;

-- Table: orthopedic_visits
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'orthopedic_visits') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'orthopedic_visits' AND column_name = 'hospital_id') THEN
        ALTER TABLE orthopedic_visits ENABLE ROW LEVEL SECURITY;
        ALTER TABLE orthopedic_visits FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_orthopedic_visits ON orthopedic_visits;
        CREATE POLICY tenant_isolation_orthopedic_visits ON orthopedic_visits FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table orthopedic_visits: %', SQLERRM;
END $$;

-- Table: pain_scores
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pain_scores') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pain_scores' AND column_name = 'hospital_id') THEN
        ALTER TABLE pain_scores ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pain_scores FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pain_scores ON pain_scores;
        CREATE POLICY tenant_isolation_pain_scores ON pain_scores FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table pain_scores: %', SQLERRM;
END $$;

-- Table: parking_sessions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parking_sessions') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parking_sessions' AND column_name = 'hospital_id') THEN
        ALTER TABLE parking_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE parking_sessions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_parking_sessions ON parking_sessions;
        CREATE POLICY tenant_isolation_parking_sessions ON parking_sessions FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table parking_sessions: %', SQLERRM;
END $$;

-- Table: parking_violations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'parking_violations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'parking_violations' AND column_name = 'hospital_id') THEN
        ALTER TABLE parking_violations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE parking_violations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_parking_violations ON parking_violations;
        CREATE POLICY tenant_isolation_parking_violations ON parking_violations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table parking_violations: %', SQLERRM;
END $$;

-- Table: patient_addresses
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_addresses') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_addresses' AND column_name = 'hospital_id') THEN
        ALTER TABLE patient_addresses ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_addresses FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_patient_addresses ON patient_addresses;
        CREATE POLICY tenant_isolation_patient_addresses ON patient_addresses FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table patient_addresses: %', SQLERRM;
END $$;

-- Table: patient_merges
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_merges') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_merges' AND column_name = 'hospital_id') THEN
        ALTER TABLE patient_merges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_merges FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_patient_merges ON patient_merges;
        CREATE POLICY tenant_isolation_patient_merges ON patient_merges FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table patient_merges: %', SQLERRM;
END $$;

-- Table: patient_vitals
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'patient_vitals') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'patient_vitals' AND column_name = 'hospital_id') THEN
        ALTER TABLE patient_vitals ENABLE ROW LEVEL SECURITY;
        ALTER TABLE patient_vitals FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_patient_vitals ON patient_vitals;
        CREATE POLICY tenant_isolation_patient_vitals ON patient_vitals FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table patient_vitals: %', SQLERRM;
END $$;

-- Table: payment_confirmation_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_confirmation_settings') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_confirmation_settings' AND column_name = 'hospital_id') THEN
        ALTER TABLE payment_confirmation_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE payment_confirmation_settings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_payment_confirmation_settings ON payment_confirmation_settings;
        CREATE POLICY tenant_isolation_payment_confirmation_settings ON payment_confirmation_settings FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table payment_confirmation_settings: %', SQLERRM;
END $$;

-- Table: payment_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_settings') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_settings' AND column_name = 'hospital_id') THEN
        ALTER TABLE payment_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE payment_settings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_payment_settings ON payment_settings;
        CREATE POLICY tenant_isolation_payment_settings ON payment_settings FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table payment_settings: %', SQLERRM;
END $$;

-- Table: payment_transactions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payment_transactions') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payment_transactions' AND column_name = 'hospital_id') THEN
        ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE payment_transactions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_payment_transactions ON payment_transactions;
        CREATE POLICY tenant_isolation_payment_transactions ON payment_transactions FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table payment_transactions: %', SQLERRM;
END $$;

-- Table: payments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payments') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'payments' AND column_name = 'hospital_id') THEN
        ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE payments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_payments ON payments;
        CREATE POLICY tenant_isolation_payments ON payments FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table payments: %', SQLERRM;
END $$;

-- Table: pending_lab_payments
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pending_lab_payments') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pending_lab_payments' AND column_name = 'hospital_id') THEN
        ALTER TABLE pending_lab_payments ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pending_lab_payments FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pending_lab_payments ON pending_lab_payments;
        CREATE POLICY tenant_isolation_pending_lab_payments ON pending_lab_payments FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table pending_lab_payments: %', SQLERRM;
END $$;

-- Table: pharmacy_inventory
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pharmacy_inventory') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'pharmacy_inventory' AND column_name = 'hospital_id') THEN
        ALTER TABLE pharmacy_inventory ENABLE ROW LEVEL SECURITY;
        ALTER TABLE pharmacy_inventory FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_pharmacy_inventory ON pharmacy_inventory;
        CREATE POLICY tenant_isolation_pharmacy_inventory ON pharmacy_inventory FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table pharmacy_inventory: %', SQLERRM;
END $$;

-- Table: phlebotomist_locations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'phlebotomist_locations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'phlebotomist_locations' AND column_name = 'hospital_id') THEN
        ALTER TABLE phlebotomist_locations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE phlebotomist_locations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_phlebotomist_locations ON phlebotomist_locations;
        CREATE POLICY tenant_isolation_phlebotomist_locations ON phlebotomist_locations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table phlebotomist_locations: %', SQLERRM;
END $$;

-- Table: po_items
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'po_items') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'po_items' AND column_name = 'hospital_id') THEN
        ALTER TABLE po_items ENABLE ROW LEVEL SECURITY;
        ALTER TABLE po_items FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_po_items ON po_items;
        CREATE POLICY tenant_isolation_po_items ON po_items FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table po_items: %', SQLERRM;
END $$;

-- Table: procedures
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'procedures') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'procedures' AND column_name = 'hospital_id') THEN
        ALTER TABLE procedures ENABLE ROW LEVEL SECURITY;
        ALTER TABLE procedures FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_procedures ON procedures;
        CREATE POLICY tenant_isolation_procedures ON procedures FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table procedures: %', SQLERRM;
END $$;

-- Table: purchase_orders
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'purchase_orders') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'purchase_orders' AND column_name = 'hospital_id') THEN
        ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
        ALTER TABLE purchase_orders FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_purchase_orders ON purchase_orders;
        CREATE POLICY tenant_isolation_purchase_orders ON purchase_orders FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table purchase_orders: %', SQLERRM;
END $$;

-- Table: radiology_templates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'radiology_templates') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'radiology_templates' AND column_name = 'hospital_id') THEN
        ALTER TABLE radiology_templates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE radiology_templates FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_radiology_templates ON radiology_templates;
        CREATE POLICY tenant_isolation_radiology_templates ON radiology_templates FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table radiology_templates: %', SQLERRM;
END $$;

-- Table: reagent_usage_log
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'reagent_usage_log') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'reagent_usage_log' AND column_name = 'hospital_id') THEN
        ALTER TABLE reagent_usage_log ENABLE ROW LEVEL SECURITY;
        ALTER TABLE reagent_usage_log FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_reagent_usage_log ON reagent_usage_log;
        CREATE POLICY tenant_isolation_reagent_usage_log ON reagent_usage_log FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table reagent_usage_log: %', SQLERRM;
END $$;

-- Table: refund_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'refund_requests') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'refund_requests' AND column_name = 'hospital_id') THEN
        ALTER TABLE refund_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE refund_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_refund_requests ON refund_requests;
        CREATE POLICY tenant_isolation_refund_requests ON refund_requests FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table refund_requests: %', SQLERRM;
END $$;

-- Table: role_permissions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'role_permissions') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'role_permissions' AND column_name = 'hospital_id') THEN
        ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE role_permissions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_role_permissions ON role_permissions;
        CREATE POLICY tenant_isolation_role_permissions ON role_permissions FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table role_permissions: %', SQLERRM;
END $$;

-- Table: sample_journey
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sample_journey') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sample_journey' AND column_name = 'hospital_id') THEN
        ALTER TABLE sample_journey ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sample_journey FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_sample_journey ON sample_journey;
        CREATE POLICY tenant_isolation_sample_journey ON sample_journey FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table sample_journey: %', SQLERRM;
END $$;

-- Table: security_checkpoints
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_checkpoints') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'security_checkpoints' AND column_name = 'hospital_id') THEN
        ALTER TABLE security_checkpoints ENABLE ROW LEVEL SECURITY;
        ALTER TABLE security_checkpoints FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_security_checkpoints ON security_checkpoints;
        CREATE POLICY tenant_isolation_security_checkpoints ON security_checkpoints FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table security_checkpoints: %', SQLERRM;
END $$;

-- Table: security_gates
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_gates') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'security_gates' AND column_name = 'hospital_id') THEN
        ALTER TABLE security_gates ENABLE ROW LEVEL SECURITY;
        ALTER TABLE security_gates FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_security_gates ON security_gates;
        CREATE POLICY tenant_isolation_security_gates ON security_gates FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table security_gates: %', SQLERRM;
END $$;

-- Table: security_incidents
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_incidents') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'security_incidents' AND column_name = 'hospital_id') THEN
        ALTER TABLE security_incidents ENABLE ROW LEVEL SECURITY;
        ALTER TABLE security_incidents FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_security_incidents ON security_incidents;
        CREATE POLICY tenant_isolation_security_incidents ON security_incidents FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table security_incidents: %', SQLERRM;
END $$;

-- Table: security_missions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'security_missions') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'security_missions' AND column_name = 'hospital_id') THEN
        ALTER TABLE security_missions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE security_missions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_security_missions ON security_missions;
        CREATE POLICY tenant_isolation_security_missions ON security_missions FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table security_missions: %', SQLERRM;
END $$;

-- Table: sms_settings
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'sms_settings') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'sms_settings' AND column_name = 'hospital_id') THEN
        ALTER TABLE sms_settings ENABLE ROW LEVEL SECURITY;
        ALTER TABLE sms_settings FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_sms_settings ON sms_settings;
        CREATE POLICY tenant_isolation_sms_settings ON sms_settings FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table sms_settings: %', SQLERRM;
END $$;

-- Table: specialist_categories
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'specialist_categories') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'specialist_categories' AND column_name = 'hospital_id') THEN
        ALTER TABLE specialist_categories ENABLE ROW LEVEL SECURITY;
        ALTER TABLE specialist_categories FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_specialist_categories ON specialist_categories;
        CREATE POLICY tenant_isolation_specialist_categories ON specialist_categories FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table specialist_categories: %', SQLERRM;
END $$;

-- Table: staff_locations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'staff_locations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'staff_locations' AND column_name = 'hospital_id') THEN
        ALTER TABLE staff_locations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE staff_locations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_staff_locations ON staff_locations;
        CREATE POLICY tenant_isolation_staff_locations ON staff_locations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table staff_locations: %', SQLERRM;
END $$;

-- Table: suppliers
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'suppliers') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'suppliers' AND column_name = 'hospital_id') THEN
        ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
        ALTER TABLE suppliers FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_suppliers ON suppliers;
        CREATE POLICY tenant_isolation_suppliers ON suppliers FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table suppliers: %', SQLERRM;
END $$;

-- Table: surgeries
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'surgeries') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'surgeries' AND column_name = 'hospital_id') THEN
        ALTER TABLE surgeries ENABLE ROW LEVEL SECURITY;
        ALTER TABLE surgeries FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_surgeries ON surgeries;
        CREATE POLICY tenant_isolation_surgeries ON surgeries FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table surgeries: %', SQLERRM;
END $$;

-- Table: surgery_blood_standards
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'surgery_blood_standards') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'surgery_blood_standards' AND column_name = 'hospital_id') THEN
        ALTER TABLE surgery_blood_standards ENABLE ROW LEVEL SECURITY;
        ALTER TABLE surgery_blood_standards FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_surgery_blood_standards ON surgery_blood_standards;
        CREATE POLICY tenant_isolation_surgery_blood_standards ON surgery_blood_standards FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table surgery_blood_standards: %', SQLERRM;
END $$;

-- Table: tenant_usage
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tenant_usage') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'tenant_usage' AND column_name = 'hospital_id') THEN
        ALTER TABLE tenant_usage ENABLE ROW LEVEL SECURITY;
        ALTER TABLE tenant_usage FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_tenant_usage ON tenant_usage;
        CREATE POLICY tenant_isolation_tenant_usage ON tenant_usage FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table tenant_usage: %', SQLERRM;
END $$;

-- Table: translations
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'translations') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'translations' AND column_name = 'hospital_id') THEN
        ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
        ALTER TABLE translations FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_translations ON translations;
        CREATE POLICY tenant_isolation_translations ON translations FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table translations: %', SQLERRM;
END $$;

-- Table: treatment_packages
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'treatment_packages') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'treatment_packages' AND column_name = 'hospital_id') THEN
        ALTER TABLE treatment_packages ENABLE ROW LEVEL SECURITY;
        ALTER TABLE treatment_packages FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_treatment_packages ON treatment_packages;
        CREATE POLICY tenant_isolation_treatment_packages ON treatment_packages FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table treatment_packages: %', SQLERRM;
END $$;

-- Table: user_sessions
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_sessions') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_sessions' AND column_name = 'hospital_id') THEN
        ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
        ALTER TABLE user_sessions FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_user_sessions ON user_sessions;
        CREATE POLICY tenant_isolation_user_sessions ON user_sessions FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table user_sessions: %', SQLERRM;
END $$;

-- Table: vehicle_inspections
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vehicle_inspections') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vehicle_inspections' AND column_name = 'hospital_id') THEN
        ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
        ALTER TABLE vehicle_inspections FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_vehicle_inspections ON vehicle_inspections;
        CREATE POLICY tenant_isolation_vehicle_inspections ON vehicle_inspections FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table vehicle_inspections: %', SQLERRM;
END $$;

-- Table: visitors
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visitors') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'visitors' AND column_name = 'hospital_id') THEN
        ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
        ALTER TABLE visitors FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_visitors ON visitors;
        CREATE POLICY tenant_isolation_visitors ON visitors FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table visitors: %', SQLERRM;
END $$;

-- Table: visits
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'visits') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'visits' AND column_name = 'hospital_id') THEN
        ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
        ALTER TABLE visits FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_visits ON visits;
        CREATE POLICY tenant_isolation_visits ON visits FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table visits: %', SQLERRM;
END $$;

-- Table: vital_signs
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vital_signs') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'vital_signs' AND column_name = 'hospital_id') THEN
        ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
        ALTER TABLE vital_signs FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_vital_signs ON vital_signs;
        CREATE POLICY tenant_isolation_vital_signs ON vital_signs FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table vital_signs: %', SQLERRM;
END $$;

-- Table: ward_change_requests
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ward_change_requests') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ward_change_requests' AND column_name = 'hospital_id') THEN
        ALTER TABLE ward_change_requests ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ward_change_requests FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ward_change_requests ON ward_change_requests;
        CREATE POLICY tenant_isolation_ward_change_requests ON ward_change_requests FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ward_change_requests: %', SQLERRM;
END $$;

-- Table: ward_consumables
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ward_consumables') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ward_consumables' AND column_name = 'hospital_id') THEN
        ALTER TABLE ward_consumables ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ward_consumables FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ward_consumables ON ward_consumables;
        CREATE POLICY tenant_isolation_ward_consumables ON ward_consumables FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ward_consumables: %', SQLERRM;
END $$;

-- Table: ward_passes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ward_passes') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ward_passes' AND column_name = 'hospital_id') THEN
        ALTER TABLE ward_passes ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ward_passes FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ward_passes ON ward_passes;
        CREATE POLICY tenant_isolation_ward_passes ON ward_passes FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ward_passes: %', SQLERRM;
END $$;

-- Table: ward_service_charges
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ward_service_charges') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ward_service_charges' AND column_name = 'hospital_id') THEN
        ALTER TABLE ward_service_charges ENABLE ROW LEVEL SECURITY;
        ALTER TABLE ward_service_charges FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_ward_service_charges ON ward_service_charges;
        CREATE POLICY tenant_isolation_ward_service_charges ON ward_service_charges FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table ward_service_charges: %', SQLERRM;
END $$;

-- Table: wards
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'wards') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'wards' AND column_name = 'hospital_id') THEN
        ALTER TABLE wards ENABLE ROW LEVEL SECURITY;
        ALTER TABLE wards FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_wards ON wards;
        CREATE POLICY tenant_isolation_wards ON wards FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table wards: %', SQLERRM;
END $$;

-- Table: webhooks
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'webhooks') AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'webhooks' AND column_name = 'hospital_id') THEN
        ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
        ALTER TABLE webhooks FORCE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS tenant_isolation_webhooks ON webhooks;
        CREATE POLICY tenant_isolation_webhooks ON webhooks FOR ALL USING (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        ) WITH CHECK (
            hospital_id = current_tenant_id() OR current_tenant_id() IS NULL
        );
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '[301v3] SKIPPED table webhooks: %', SQLERRM;
END $$;

