# 🛡️ WOLF HMS — Row-Level Security (RLS) Matrix

*Audit and Policy Coverage across all PostgreSQL tables in wolf_hms_prod.*

| # | Table Name | Has hospital_id | RLS Status | Policy Name | Defined In |
|---|---|---|---|---|---|
| 1 | `patients` | Yes | ✅ Active (Baseline) | `tenant_isolation_patients` | `300_row_level_security.sql` |
| 2 | `admissions` | Yes | ✅ Active (Baseline) | `tenant_isolation_admissions` | `300_row_level_security.sql` |
| 3 | `opd_visits` | Yes | ✅ Active (Baseline) | `tenant_isolation_opd_visits` | `300_row_level_security.sql` |
| 4 | `lab_requests` | Yes | ✅ Active (Baseline) | `tenant_isolation_lab_requests` | `300_row_level_security.sql` |
| 5 | `lab_results` | Yes | ✅ Active (Baseline) | `tenant_isolation_lab_results` | `300_row_level_security.sql` |
| 6 | `invoices` | Yes | ✅ Active (Baseline) | `tenant_isolation_invoices` | `300_row_level_security.sql` |
| 7 | `payments` | Yes | ✅ Active (Baseline) | `tenant_isolation_payments` | `300_row_level_security.sql` |
| 8 | `prescriptions` | Yes | ✅ Active (Baseline) | `tenant_isolation_prescriptions` | `300_row_level_security.sql` |
| 9 | `care_tasks` | Yes | ✅ Active (Baseline) | `tenant_isolation_care_tasks` | `300_row_level_security.sql` |
| 10 | `vitals_logs` | Yes | ✅ Active (Baseline) | `tenant_isolation_vitals_logs` | `300_row_level_security.sql` |
| 11 | `inventory_items` | Yes | ✅ Active (Baseline) | `tenant_isolation_inventory_items` | `300_row_level_security.sql` |
| 12 | `users` | Yes | ✅ Active (Baseline) | `tenant_isolation_users` | `300_row_level_security.sql` |
| 13 | `access_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_access_logs` | `301_rls_gapfill.sql` |
| 14 | `ai_billing_predictions` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_ai_billing_predictions` | `301_rls_gapfill.sql` |
| 15 | `anaesthesia_charts` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_anaesthesia_charts` | `301_rls_gapfill.sql` |
| 16 | `app_build_history` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_app_build_history` | `301_rls_gapfill.sql` |
| 17 | `article_bookmarks` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_article_bookmarks` | `301_rls_gapfill.sql` |
| 18 | `billing_kpis` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_billing_kpis` | `301_rls_gapfill.sql` |
| 19 | `blood_donation_campaigns` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_blood_donation_campaigns` | `301_rls_gapfill.sql` |
| 20 | `blood_storage_equipment` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_blood_storage_equipment` | `301_rls_gapfill.sql` |
| 21 | `blood_temperature_log` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_blood_temperature_log` | `301_rls_gapfill.sql` |
| 22 | `chemo_cycles` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_chemo_cycles` | `301_rls_gapfill.sql` |
| 23 | `chemo_sessions` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_chemo_sessions` | `301_rls_gapfill.sql` |
| 24 | `claim_denials` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_claim_denials` | `301_rls_gapfill.sql` |
| 25 | `clinical_history` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_clinical_history` | `301_rls_gapfill.sql` |
| 26 | `clinical_tasks` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_clinical_tasks` | `301_rls_gapfill.sql` |
| 27 | `clinical_vitals` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_clinical_vitals` | `301_rls_gapfill.sql` |
| 28 | `collections_worklist` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_collections_worklist` | `301_rls_gapfill.sql` |
| 29 | `consumable_usage` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_consumable_usage` | `301_rls_gapfill.sql` |
| 30 | `cssd_trays` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_cssd_trays` | `301_rls_gapfill.sql` |
| 31 | `data_anonymization_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_data_anonymization_logs` | `301_rls_gapfill.sql` |
| 32 | `dispense_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_dispense_logs` | `301_rls_gapfill.sql` |
| 33 | `doctor_slots` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_doctor_slots` | `301_rls_gapfill.sql` |
| 34 | `drug_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_drug_logs` | `301_rls_gapfill.sql` |
| 35 | `eligibility_checks` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_eligibility_checks` | `301_rls_gapfill.sql` |
| 36 | `emergency_events` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_emergency_events` | `301_rls_gapfill.sql` |
| 37 | `emergency_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_emergency_logs` | `301_rls_gapfill.sql` |
| 38 | `emergency_status` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_emergency_status` | `301_rls_gapfill.sql` |
| 39 | `equipment_billing` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_equipment_billing` | `301_rls_gapfill.sql` |
| 40 | `equipment_inventory` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_equipment_inventory` | `301_rls_gapfill.sql` |
| 41 | `equipment_requests` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_equipment_requests` | `301_rls_gapfill.sql` |
| 42 | `floor_plans` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_floor_plans` | `301_rls_gapfill.sql` |
| 43 | `floor_zones` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_floor_zones` | `301_rls_gapfill.sql` |
| 44 | `guard_locations` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_guard_locations` | `301_rls_gapfill.sql` |
| 45 | `guard_shifts` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_guard_shifts` | `301_rls_gapfill.sql` |
| 46 | `housekeeping_tasks` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_housekeeping_tasks` | `301_rls_gapfill.sql` |
| 47 | `instrument_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_instrument_logs` | `301_rls_gapfill.sql` |
| 48 | `instrument_stats` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_instrument_stats` | `301_rls_gapfill.sql` |
| 49 | `insurance_preauth` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_insurance_preauth` | `301_rls_gapfill.sql` |
| 50 | `insurance_providers` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_insurance_providers` | `301_rls_gapfill.sql` |
| 51 | `invoice_payments` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_invoice_payments` | `301_rls_gapfill.sql` |
| 52 | `lab_critical_values` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_critical_values` | `301_rls_gapfill.sql` |
| 53 | `lab_instruments` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_instruments` | `301_rls_gapfill.sql` |
| 54 | `lab_parameter_mappings` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_parameter_mappings` | `301_rls_gapfill.sql` |
| 55 | `lab_parameters` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_parameters` | `301_rls_gapfill.sql` |
| 56 | `lab_payments` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_payments` | `301_rls_gapfill.sql` |
| 57 | `lab_public_reports` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_public_reports` | `301_rls_gapfill.sql` |
| 58 | `lab_request_tests` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_request_tests` | `301_rls_gapfill.sql` |
| 59 | `lab_revenue_log` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_revenue_log` | `301_rls_gapfill.sql` |
| 60 | `lab_tat_log` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_lab_tat_log` | `301_rls_gapfill.sql` |
| 61 | `master_identities` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_master_identities` | `301_rls_gapfill.sql` |
| 62 | `medication_administration` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_medication_administration` | `301_rls_gapfill.sql` |
| 63 | `nurse_care_tasks` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_nurse_care_tasks` | `301_rls_gapfill.sql` |
| 64 | `oncology_staging` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_oncology_staging` | `301_rls_gapfill.sql` |
| 65 | `ot_schedules` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_ot_schedules` | `301_rls_gapfill.sql` |
| 66 | `pac_assessments` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pac_assessments` | `301_rls_gapfill.sql` |
| 67 | `package_extras` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_package_extras` | `301_rls_gapfill.sql` |
| 68 | `package_items` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_package_items` | `301_rls_gapfill.sql` |
| 69 | `pacu_records` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pacu_records` | `301_rls_gapfill.sql` |
| 70 | `pain_assessments` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pain_assessments` | `301_rls_gapfill.sql` |
| 71 | `patient_documents` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_patient_documents` | `301_rls_gapfill.sql` |
| 72 | `patient_history` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_patient_history` | `301_rls_gapfill.sql` |
| 73 | `patient_insurance` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_patient_insurance` | `301_rls_gapfill.sql` |
| 74 | `patient_packages` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_patient_packages` | `301_rls_gapfill.sql` |
| 75 | `payer_profiles` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_payer_profiles` | `301_rls_gapfill.sql` |
| 76 | `pharmacy_order_items` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pharmacy_order_items` | `301_rls_gapfill.sql` |
| 77 | `pharmacy_orders` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pharmacy_orders` | `301_rls_gapfill.sql` |
| 78 | `pharmacy_price_requests` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pharmacy_price_requests` | `301_rls_gapfill.sql` |
| 79 | `platform_audit_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_platform_audit_logs` | `301_rls_gapfill.sql` |
| 80 | `pmjay_beneficiaries` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pmjay_beneficiaries` | `301_rls_gapfill.sql` |
| 81 | `pmjay_packages` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pmjay_packages` | `301_rls_gapfill.sql` |
| 82 | `pos_activity_log` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pos_activity_log` | `301_rls_gapfill.sql` |
| 83 | `pos_credentials` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pos_credentials` | `301_rls_gapfill.sql` |
| 84 | `pos_devices` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pos_devices` | `301_rls_gapfill.sql` |
| 85 | `pos_providers` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pos_providers` | `301_rls_gapfill.sql` |
| 86 | `pos_refunds` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pos_refunds` | `301_rls_gapfill.sql` |
| 87 | `pos_settlements` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_pos_settlements` | `301_rls_gapfill.sql` |
| 88 | `preauth_requests` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_preauth_requests` | `301_rls_gapfill.sql` |
| 89 | `purchase_order_items` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_purchase_order_items` | `301_rls_gapfill.sql` |
| 90 | `review_helpful` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_review_helpful` | `301_rls_gapfill.sql` |
| 91 | `safety_counts` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_safety_counts` | `301_rls_gapfill.sql` |
| 92 | `security_geofences` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_security_geofences` | `301_rls_gapfill.sql` |
| 93 | `security_patrols` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_security_patrols` | `301_rls_gapfill.sql` |
| 94 | `security_visitors` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_security_visitors` | `301_rls_gapfill.sql` |
| 95 | `sensor_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_sensor_logs` | `301_rls_gapfill.sql` |
| 96 | `shift_handovers` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_shift_handovers` | `301_rls_gapfill.sql` |
| 97 | `sterilization_cycles` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_sterilization_cycles` | `301_rls_gapfill.sql` |
| 98 | `system_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_system_logs` | `301_rls_gapfill.sql` |
| 99 | `system_settings` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_system_settings` | `301_rls_gapfill.sql` |
| 100 | `tpa_activity_log` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_tpa_activity_log` | `301_rls_gapfill.sql` |
| 101 | `tpa_credentials` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_tpa_credentials` | `301_rls_gapfill.sql` |
| 102 | `tpa_providers` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_tpa_providers` | `301_rls_gapfill.sql` |
| 103 | `vital_logs` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_vital_logs` | `301_rls_gapfill.sql` |
| 104 | `vitals` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_vitals` | `301_rls_gapfill.sql` |
| 105 | `ward_charges` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_ward_charges` | `301_rls_gapfill.sql` |
| 106 | `ward_requests` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_ward_requests` | `301_rls_gapfill.sql` |
| 107 | `webhook_deliveries` | Yes | ⏳ Migrating (Phase 2) | `tenant_isolation_webhook_deliveries` | `301_rls_gapfill.sql` |

---

## Summary
- **Total Tables in Multi-Tenant Catalog**: 107
- **Baseline Tables (Migration 300)**: 12
- **Gap-Fill Tables (Migration 301)**: 95
- **Enforcement Strategy**: `ALTER TABLE ... ENABLE ROW LEVEL SECURITY; ALTER TABLE ... FORCE ROW LEVEL SECURITY;`
- **Tenant Context Function**: `current_tenant_id()` -> `NULLIF(current_setting('app.current_tenant', true), '')::INTEGER`
