-- ============================================================
-- Multi-Tenant Isolation Migration
-- Wolf HMS — Phase 4: Add hospital_id to 96 tables
-- Generated: 2026-03-07
--
-- STRATEGY:
--   1. ALTER TABLE ... ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id)
--   2. CREATE INDEX for query performance
--   3. BACKFILL existing rows to hospital_id = 1 (Kokila Hospital)
--
-- SAFE: Uses IF NOT EXISTS — re-runnable without errors
-- ============================================================
BEGIN;
-- ============================================================
-- TIER 1: Patient/Clinical Data (30 tables) — HIGHEST PRIORITY
-- ============================================================
-- Clinical
ALTER TABLE clinical_history
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE clinical_tasks
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE clinical_vitals
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE medication_administration
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE nurse_care_tasks
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pain_assessments
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pac_assessments
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pacu_records
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Patient Records
ALTER TABLE patient_documents
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE patient_history
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE patient_insurance
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE patient_packages
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Pharmacy
ALTER TABLE pharmacy_orders
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pharmacy_order_items
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pharmacy_price_requests
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE consumable_usage
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE collections_worklist
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE dispense_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Surgery / OT
ALTER TABLE ot_schedules
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Equipment
ALTER TABLE equipment_billing
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE equipment_inventory
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE equipment_requests
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Vitals
ALTER TABLE vital_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE vitals
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Ward
ALTER TABLE ward_charges
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE ward_requests
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- Insurance / Billing
ALTER TABLE insurance_preauth
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE preauth_requests
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE invoice_payments
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_payments
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- ============================================================
-- TIER 2: Operational/Admin (25 tables)
-- ============================================================
ALTER TABLE access_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE anaesthesia_charts
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE blood_donation_campaigns
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE blood_storage_equipment
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE blood_temperature_log
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE cssd_trays
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE drug_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE eligibility_checks
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE emergency_status
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE floor_plans
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE guard_locations
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE guard_shifts
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE housekeeping_tasks
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_critical_values
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_instruments
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_parameter_mappings
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_parameters
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_public_reports
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_request_tests
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_revenue_log
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE lab_tat_log
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE safety_counts
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE security_geofences
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE security_patrols
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE security_visitors
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- ============================================================
-- TIER 3: Reference/Config (20 tables)
-- ============================================================
ALTER TABLE ai_billing_predictions
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE billing_kpis
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE doctor_slots
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE instrument_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE instrument_stats
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pos_activity_log
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pos_credentials
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pos_devices
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pos_providers
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pos_refunds
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pos_settlements
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE shift_handovers
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE sterilization_cycles
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE sensor_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE system_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE system_settings
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE tpa_activity_log
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE tpa_credentials
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE tpa_providers
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE webhook_deliveries
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- ============================================================
-- ADDITIONAL: Remaining tables from audit (21 tables)
-- ============================================================
ALTER TABLE app_build_history
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE claim_denials
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE insurance_providers
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE package_extras
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE package_items
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE platform_audit_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pmjay_beneficiaries
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE pmjay_packages
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE purchase_order_items
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE article_bookmarks
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE review_helpful
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE master_identities
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE payer_profiles
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE oncology_staging
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE chemo_cycles
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE chemo_sessions
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
ALTER TABLE data_anonymization_logs
ADD COLUMN IF NOT EXISTS hospital_id INT REFERENCES hospitals(id);
-- ============================================================
-- INDEXES: Performance optimization for tenant filtering
-- ============================================================
-- Tier 1 indexes
CREATE INDEX IF NOT EXISTS idx_clinical_history_hospital ON clinical_history(hospital_id);
CREATE INDEX IF NOT EXISTS idx_clinical_tasks_hospital ON clinical_tasks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_clinical_vitals_hospital ON clinical_vitals(hospital_id);
CREATE INDEX IF NOT EXISTS idx_medication_administration_hospital ON medication_administration(hospital_id);
CREATE INDEX IF NOT EXISTS idx_nurse_care_tasks_hospital ON nurse_care_tasks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pain_assessments_hospital ON pain_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pac_assessments_hospital ON pac_assessments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pacu_records_hospital ON pacu_records(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_documents_hospital ON patient_documents(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_history_hospital ON patient_history(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_insurance_hospital ON patient_insurance(hospital_id);
CREATE INDEX IF NOT EXISTS idx_patient_packages_hospital ON patient_packages(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_orders_hospital ON pharmacy_orders(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_order_items_hospital ON pharmacy_order_items(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_price_requests_hospital ON pharmacy_price_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_consumable_usage_hospital ON consumable_usage(hospital_id);
CREATE INDEX IF NOT EXISTS idx_collections_worklist_hospital ON collections_worklist(hospital_id);
CREATE INDEX IF NOT EXISTS idx_dispense_logs_hospital ON dispense_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ot_schedules_hospital ON ot_schedules(hospital_id);
CREATE INDEX IF NOT EXISTS idx_equipment_billing_hospital ON equipment_billing(hospital_id);
CREATE INDEX IF NOT EXISTS idx_equipment_inventory_hospital ON equipment_inventory(hospital_id);
CREATE INDEX IF NOT EXISTS idx_equipment_requests_hospital ON equipment_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_vital_logs_hospital ON vital_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_vitals_hospital ON vitals(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ward_charges_hospital ON ward_charges(hospital_id);
CREATE INDEX IF NOT EXISTS idx_ward_requests_hospital ON ward_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_preauth_hospital ON insurance_preauth(hospital_id);
CREATE INDEX IF NOT EXISTS idx_preauth_requests_hospital ON preauth_requests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_hospital ON invoice_payments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_payments_hospital ON lab_payments(hospital_id);
-- Tier 2 indexes
CREATE INDEX IF NOT EXISTS idx_access_logs_hospital ON access_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_anaesthesia_charts_hospital ON anaesthesia_charts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_donation_campaigns_hospital ON blood_donation_campaigns(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_storage_equipment_hospital ON blood_storage_equipment(hospital_id);
CREATE INDEX IF NOT EXISTS idx_blood_temperature_log_hospital ON blood_temperature_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_cssd_trays_hospital ON cssd_trays(hospital_id);
CREATE INDEX IF NOT EXISTS idx_drug_logs_hospital ON drug_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_eligibility_checks_hospital ON eligibility_checks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_emergency_status_hospital ON emergency_status(hospital_id);
CREATE INDEX IF NOT EXISTS idx_floor_plans_hospital ON floor_plans(hospital_id);
CREATE INDEX IF NOT EXISTS idx_guard_locations_hospital ON guard_locations(hospital_id);
CREATE INDEX IF NOT EXISTS idx_guard_shifts_hospital ON guard_shifts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_housekeeping_tasks_hospital ON housekeeping_tasks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_critical_values_hospital ON lab_critical_values(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_instruments_hospital ON lab_instruments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_parameter_mappings_hospital ON lab_parameter_mappings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_parameters_hospital ON lab_parameters(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_public_reports_hospital ON lab_public_reports(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_request_tests_hospital ON lab_request_tests(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_revenue_log_hospital ON lab_revenue_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_lab_tat_log_hospital ON lab_tat_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_safety_counts_hospital ON safety_counts(hospital_id);
CREATE INDEX IF NOT EXISTS idx_security_geofences_hospital ON security_geofences(hospital_id);
CREATE INDEX IF NOT EXISTS idx_security_patrols_hospital ON security_patrols(hospital_id);
CREATE INDEX IF NOT EXISTS idx_security_visitors_hospital ON security_visitors(hospital_id);
-- Tier 3 indexes
CREATE INDEX IF NOT EXISTS idx_ai_billing_predictions_hospital ON ai_billing_predictions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_billing_kpis_hospital ON billing_kpis(hospital_id);
CREATE INDEX IF NOT EXISTS idx_doctor_slots_hospital ON doctor_slots(hospital_id);
CREATE INDEX IF NOT EXISTS idx_instrument_logs_hospital ON instrument_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_instrument_stats_hospital ON instrument_stats(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pos_activity_log_hospital ON pos_activity_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pos_credentials_hospital ON pos_credentials(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pos_devices_hospital ON pos_devices(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pos_providers_hospital ON pos_providers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pos_refunds_hospital ON pos_refunds(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pos_settlements_hospital ON pos_settlements(hospital_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_hospital ON shift_handovers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_sterilization_cycles_hospital ON sterilization_cycles(hospital_id);
CREATE INDEX IF NOT EXISTS idx_sensor_logs_hospital ON sensor_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_hospital ON system_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_hospital ON system_settings(hospital_id);
CREATE INDEX IF NOT EXISTS idx_tpa_activity_log_hospital ON tpa_activity_log(hospital_id);
CREATE INDEX IF NOT EXISTS idx_tpa_credentials_hospital ON tpa_credentials(hospital_id);
CREATE INDEX IF NOT EXISTS idx_tpa_providers_hospital ON tpa_providers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_hospital ON webhook_deliveries(hospital_id);
-- Additional indexes
CREATE INDEX IF NOT EXISTS idx_app_build_history_hospital ON app_build_history(hospital_id);
CREATE INDEX IF NOT EXISTS idx_claim_denials_hospital ON claim_denials(hospital_id);
CREATE INDEX IF NOT EXISTS idx_insurance_providers_hospital ON insurance_providers(hospital_id);
CREATE INDEX IF NOT EXISTS idx_package_extras_hospital ON package_extras(hospital_id);
CREATE INDEX IF NOT EXISTS idx_package_items_hospital ON package_items(hospital_id);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_hospital ON platform_audit_logs(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pmjay_beneficiaries_hospital ON pmjay_beneficiaries(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pmjay_packages_hospital ON pmjay_packages(hospital_id);
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_hospital ON purchase_order_items(hospital_id);
CREATE INDEX IF NOT EXISTS idx_article_bookmarks_hospital ON article_bookmarks(hospital_id);
CREATE INDEX IF NOT EXISTS idx_review_helpful_hospital ON review_helpful(hospital_id);
CREATE INDEX IF NOT EXISTS idx_master_identities_hospital ON master_identities(hospital_id);
CREATE INDEX IF NOT EXISTS idx_payer_profiles_hospital ON payer_profiles(hospital_id);
CREATE INDEX IF NOT EXISTS idx_oncology_staging_hospital ON oncology_staging(hospital_id);
CREATE INDEX IF NOT EXISTS idx_chemo_cycles_hospital ON chemo_cycles(hospital_id);
CREATE INDEX IF NOT EXISTS idx_chemo_sessions_hospital ON chemo_sessions(hospital_id);
CREATE INDEX IF NOT EXISTS idx_data_anonymization_logs_hospital ON data_anonymization_logs(hospital_id);
-- ============================================================
-- BACKFILL: Assign all existing data to Hospital 1 (Kokila)
-- ============================================================
DO $$
DECLARE tbl TEXT;
tables TEXT [] := ARRAY [
        'clinical_history','clinical_tasks','clinical_vitals','medication_administration',
        'nurse_care_tasks','pain_assessments','pac_assessments','pacu_records',
        'patient_documents','patient_history','patient_insurance','patient_packages',
        'pharmacy_orders','pharmacy_order_items','pharmacy_price_requests',
        'consumable_usage','collections_worklist','dispense_logs','ot_schedules',
        'equipment_billing','equipment_inventory','equipment_requests',
        'vital_logs','vitals','ward_charges','ward_requests',
        'insurance_preauth','preauth_requests','invoice_payments','lab_payments',
        'access_logs','anaesthesia_charts','blood_donation_campaigns',
        'blood_storage_equipment','blood_temperature_log','cssd_trays',
        'drug_logs','eligibility_checks','emergency_status','floor_plans',
        'guard_locations','guard_shifts','housekeeping_tasks',
        'lab_critical_values','lab_instruments','lab_parameter_mappings',
        'lab_parameters','lab_public_reports','lab_request_tests',
        'lab_revenue_log','lab_tat_log','safety_counts','security_geofences',
        'security_patrols','security_visitors',
        'ai_billing_predictions','billing_kpis','doctor_slots','instrument_logs',
        'instrument_stats','pos_activity_log','pos_credentials','pos_devices',
        'pos_providers','pos_refunds','pos_settlements',
        'shift_handovers','sterilization_cycles','sensor_logs',
        'system_logs','system_settings','tpa_activity_log','tpa_credentials',
        'tpa_providers','webhook_deliveries',
        'app_build_history','claim_denials','insurance_providers',
        'package_extras','package_items','platform_audit_logs',
        'pmjay_beneficiaries','pmjay_packages','purchase_order_items',
        'article_bookmarks','review_helpful','master_identities',
        'payer_profiles','oncology_staging','chemo_cycles','chemo_sessions',
        'data_anonymization_logs'
    ];
BEGIN FOR i IN 1..array_length(tables, 1) LOOP tbl := tables [i];
BEGIN EXECUTE format(
    'UPDATE %I SET hospital_id = 1 WHERE hospital_id IS NULL',
    tbl
);
RAISE NOTICE 'Backfilled: %',
tbl;
EXCEPTION
WHEN undefined_table THEN RAISE NOTICE 'Skipped (table not found): %',
tbl;
WHEN undefined_column THEN RAISE NOTICE 'Skipped (column not found): %',
tbl;
END;
END LOOP;
END $$;
COMMIT;
-- ============================================================
-- VERIFICATION: Run after migration to confirm
-- ============================================================
-- SELECT table_name, column_name FROM information_schema.columns 
--   WHERE column_name = 'hospital_id' AND table_schema = 'public' 
--   ORDER BY table_name;