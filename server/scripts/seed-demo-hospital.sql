-- =====================================================================
-- PRE-DEMO QA — Deterministic Golden Hospital Seed  (hospital_id = 1)
--
-- Idempotent: every statement is re-runnable (ON CONFLICT / WHERE NOT EXISTS).
-- Zero placeholder text ("Test 123" / "Lorem ipsum") — realistic Indian data.
--
-- Placeholders injected by server/scripts/seed-demo-hospital.js:
--   :DOCTOR_PASSWORD_HASH, :NURSE_PASSWORD_HASH  (bcrypt of 'password123')
--
-- PK law observed (LOCAL schema, verified by scripts/qa/schema-dump.js):
--   patients.id  = UUID    | admissions.id = INTEGER (local) | hospitals.id = INTEGER
--   users.id     = INTEGER | inventory_items.id = INTEGER
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Tenant 1 profile — fill in realistic details WITHOUT renaming the
--    tenant (contract test tests/contract/slowQueryTelemetry.test.js pins
--    hospitals.id=1 name).
-- ---------------------------------------------------------------------
UPDATE hospitals
   SET city = COALESCE(city, 'Pune'),
       state = COALESCE(state, 'Maharashtra'),
       country = COALESCE(country, 'India'),
       address = COALESCE(address, 'Plot 14, Baner Road, Baner'),
       phone = COALESCE(phone, '+91 20 4123 4500'),
       email = COALESCE(email, 'frontdesk@kokilahospital.in'),
       status = COALESCE(status, 'active'),
       updated_at = now()
 WHERE id = 1;

-- ---------------------------------------------------------------------
-- 2. Demo clinical staff for hospital 1 (doctor + nurse), deterministic logins
-- ---------------------------------------------------------------------
INSERT INTO users (username, password, email, role, name, hospital_id, department, is_active, approval_status, consultation_fee)
VALUES
  ('doctor_demo', ':DOCTOR_PASSWORD_HASH', 'dr.meera.kulkarni@kokilahospital.in', 'doctor', 'Dr. Meera Kulkarni', 1, 'General Medicine', true, 'approved', 700),
  ('nurse_demo',  ':NURSE_PASSWORD_HASH',  'sr.anita.deshmukh@kokilahospital.in', 'nurse',  'Sr. Anita Deshmukh',  1, 'Nursing',        true, 'approved', 0)
ON CONFLICT (username) DO UPDATE
   SET password = EXCLUDED.password,
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       role = EXCLUDED.role,
       hospital_id = EXCLUDED.hospital_id,
       department = EXCLUDED.department,
       is_active = true,
       approval_status = 'approved';

-- ---------------------------------------------------------------------
-- 3. ICU ward + 6 ICU beds (only seeded if absent) — Cohort D target
-- ---------------------------------------------------------------------
INSERT INTO wards (name, type, floor, building, total_beds, available_beds, occupied_beds, capacity, hospital_id, is_active, nurse_station)
SELECT 'ICU', 'ICU', '3', 'Main Block', 6, 3, 3, 6, 1, true, 'ICU Central Station'
 WHERE NOT EXISTS (SELECT 1 FROM wards WHERE name = 'ICU' AND hospital_id = 1);

INSERT INTO beds (ward_id, bed_number, bed_type, status, daily_rate, hospital_id, is_active)
SELECT w.id, v.bed_number, 'ICU', 'Available', 6500, 1, true
  FROM wards w
  CROSS JOIN (VALUES ('ICU-01'), ('ICU-02'), ('ICU-03'), ('ICU-04'), ('ICU-05'), ('ICU-06')) AS v(bed_number)
 WHERE w.name = 'ICU' AND w.hospital_id = 1
   AND NOT EXISTS (SELECT 1 FROM beds b WHERE b.ward_id = w.id AND b.bed_number = v.bed_number);

-- ---------------------------------------------------------------------
-- 4. 15 deterministic patients (Cohorts A–E)
-- ---------------------------------------------------------------------
INSERT INTO patients (id, name, dob, gender, phone, address, hospital_id, uhid, abha_id, blood_group, is_registered, visit_count, last_visit_date, history_json)
VALUES
  -- Cohort A — OPD & Triage (4)
  ('a0000000-0000-4000-8000-000000000001', 'Priya Sharma',   '1988-04-12', 'Female', '+91 98200 41122', '12 Sahyadri Society, Kothrud, Pune',  1, 'UHID-DEMO-0001', '91-2401-5567-1122', 'B+',  true, 3,  CURRENT_DATE, '{"chronic": ["Hypothyroidism"], "allergies": ["Penicillin"]}'),
  ('a0000000-0000-4000-8000-000000000002', 'Rajesh Kumar',   '1975-11-30', 'Male',   '+91 98901 77340', '48 Shivaji Nagar, Pune',              1, 'UHID-DEMO-0002', '91-2401-5567-2233', 'O+',  true, 5,  CURRENT_DATE, '{"chronic": ["Type 2 Diabetes"], "allergies": []}'),
  ('a0000000-0000-4000-8000-000000000003', 'Fatima Sheikh',  '1993-07-08', 'Female', '+91 97022 10987', '7 Camp Road, Pune Cantonment',        1, 'UHID-DEMO-0003', '91-2401-5567-3344', 'A+',  true, 1,  CURRENT_DATE, '{"chronic": [], "allergies": ["Sulfa drugs"]}'),
  ('a0000000-0000-4000-8000-000000000004', 'Vikram Patel',   '1968-02-19', 'Male',   '+91 99300 55221', '221 Aundh Road, Aundh, Pune',         1, 'UHID-DEMO-0004', '91-2401-5567-4455', 'AB+', true, 8,  CURRENT_DATE, '{"chronic": ["Hypertension"], "allergies": []}'),
  -- Cohort B — Clinical & AI Safety (1)
  ('b0000000-0000-4000-8000-000000000001', 'Ananya Iyer',    '1957-09-25', 'Female', '+91 98201 33445', '5 Model Colony, Shivajinagar, Pune',  1, 'UHID-DEMO-0005', '91-2401-5567-5566', 'B-',  true, 12, CURRENT_DATE, '{"chronic": ["Atrial Fibrillation", "Hypertension"], "allergies": []}'),
  -- Cohort C — Diagnostics (4)
  ('c0000000-0000-4000-8000-000000000001', 'Sunil Deshmukh', '1981-06-14', 'Male',   '+91 98902 66554', '33 Karve Nagar, Pune',                1, 'UHID-DEMO-0006', '91-2401-5567-6677', 'O-',  true, 2,  CURRENT_DATE, '{"chronic": [], "allergies": []}'),
  ('c0000000-0000-4000-8000-000000000002', 'Meena Joshi',    '1990-12-02', 'Female', '+91 97010 88123', '18 Kalyani Nagar, Pune',              1, 'UHID-DEMO-0007', '91-2401-5567-7788', 'A-',  true, 4,  CURRENT_DATE, '{"chronic": ["Iron deficiency anaemia"], "allergies": []}'),
  ('c0000000-0000-4000-8000-000000000003', 'Arjun Nair',     '2001-03-27', 'Male',   '+91 97654 33210', '89 Baner Pashan Link Road, Pune',     1, 'UHID-DEMO-0008', '91-2401-5567-8899', 'B+',  true, 1,  CURRENT_DATE, '{"chronic": [], "allergies": ["Dust"]}'),
  ('c0000000-0000-4000-8000-000000000004', 'Lakshmi Reddy',  '1964-08-16', 'Female', '+91 98123 77456', '64 Viman Nagar, Pune',                1, 'UHID-DEMO-0009', '91-2401-5567-9900', 'AB-', true, 9,  CURRENT_DATE, '{"chronic": ["COPD"], "allergies": []}'),
  -- Cohort D — IPD & ICU (3)
  ('d0000000-0000-4000-8000-000000000001', 'Suresh Menon',   '1952-01-09', 'Male',   '+91 98999 12345', '3 Deccan Gymkhana, Pune',             1, 'UHID-DEMO-0010', '91-2401-5568-1122', 'A+',  true, 6,  CURRENT_DATE, '{"chronic": ["Ischaemic heart disease"], "allergies": []}'),
  ('d0000000-0000-4000-8000-000000000002', 'Nisha Kulkarni', '1986-05-21', 'Female', '+91 97003 45678', '27 Wanowrie, Pune',                   1, 'UHID-DEMO-0011', '91-2401-5568-2233', 'O+',  true, 2,  CURRENT_DATE, '{"chronic": ["Post-operative care"], "allergies": ["Latex"]}'),
  ('d0000000-0000-4000-8000-000000000003', 'Imran Qureshi',  '1979-10-11', 'Male',   '+91 98211 99887', '56 Kondhwa Road, Pune',               1, 'UHID-DEMO-0012', '91-2401-5568-3344', 'B+',  true, 7,  CURRENT_DATE, '{"chronic": ["Chronic kidney disease"], "allergies": []}'),
  -- Cohort E — Emergency & Billing (3)
  ('e0000000-0000-4000-8000-000000000001', 'Ganesh Pawar',   '1970-07-04', 'Male',   '+91 98904 22110', '91 Hadapsar, Pune',                   1, 'UHID-DEMO-0013', '91-2401-5568-4455', 'O-',  true, 5,  CURRENT_DATE, '{"chronic": ["Angina"], "allergies": []}'),
  ('e0000000-0000-4000-8000-000000000002', 'Sneha Bhat',     '1995-02-28', 'Female', '+91 97007 66543', '14 Pimple Saudagar, Pune',            1, 'UHID-DEMO-0014', '91-2401-5568-5566', 'A+',  true, 3,  CURRENT_DATE, '{"chronic": [], "allergies": []}'),
  ('e0000000-0000-4000-8000-000000000003', 'Ramesh Yadav',   '1961-11-13', 'Male',   '+91 98110 33447', '38 Fatima Nagar, Pune',               1, 'UHID-DEMO-0015', '91-2401-5568-6677', 'B-',  true, 11, CURRENT_DATE, '{"chronic": ["Osteoarthritis"], "allergies": ["Ibuprofen"]}')
ON CONFLICT (id) DO UPDATE
   SET name = EXCLUDED.name,
       dob = EXCLUDED.dob,
       gender = EXCLUDED.gender,
       phone = EXCLUDED.phone,
       address = EXCLUDED.address,
       hospital_id = EXCLUDED.hospital_id,
       uhid = EXCLUDED.uhid,
       abha_id = EXCLUDED.abha_id,
       blood_group = EXCLUDED.blood_group,
       is_registered = true,
       last_visit_date = CURRENT_DATE,
       updated_at = now();

-- ---------------------------------------------------------------------
-- 5. COHORT A — OPD & Triage: 4 waiting OPD visits (AI symptom analysis ready)
-- ---------------------------------------------------------------------
INSERT INTO opd_visits (patient_id, doctor_id, token_number, status, visit_date, complaint, notes, hospital_id, consultation_type)
SELECT v.patient_id, (SELECT id FROM users WHERE username = 'doctor_demo'), v.token, 'Waiting', CURRENT_DATE, v.complaint, v.notes, 1, 'in-person'
  FROM (VALUES
        ('a0000000-0000-4000-8000-000000000001'::uuid, 1, 'Fever with dry cough for 3 days, sore throat',            'BP 118/76, SpO2 97%, Temp 100.8F'),
        ('a0000000-0000-4000-8000-000000000002'::uuid, 2, 'Increased thirst and burning feet since 2 weeks',        'Known T2DM, fasting sugars high at home'),
        ('a0000000-0000-4000-8000-000000000003'::uuid, 3, 'Itching rash over both forearms after new detergent',    'No breathlessness, no facial swelling'),
        ('a0000000-0000-4000-8000-000000000004'::uuid, 4, 'Occipital headache with neck stiffness since morning',   'BP 158/96, on Amlodipine 5mg')
       ) AS v(patient_id, token, complaint, notes)
 WHERE NOT EXISTS (
        SELECT 1 FROM opd_visits ov
         WHERE ov.patient_id = v.patient_id AND ov.visit_date = CURRENT_DATE
   );

-- ---------------------------------------------------------------------
-- 6. COHORT B — Clinical & AI Safety: active Warfarin + Aspirin profile
--    (prescribing Ciprofloxacin deterministically triggers the interaction checker)
-- ---------------------------------------------------------------------
INSERT INTO prescriptions (patient_id, doctor_id, diagnosis, medications, notes, is_active, hospital_id)
SELECT 'b0000000-0000-4000-8000-000000000001'::uuid,
       (SELECT id FROM users WHERE username = 'doctor_demo'),
       'Atrial Fibrillation with Hypertension',
       '[{"name":"Warfarin","dose":"5mg","freq":"OD","duration":"90 days"},{"name":"Aspirin","dose":"75mg","freq":"OD","duration":"90 days"},{"name":"Metoprolol","dose":"25mg","freq":"BD","duration":"90 days"}]'::jsonb,
       'INR monitoring weekly. Anticoagulation clinic follow-up.',
       true,
       1
 WHERE NOT EXISTS (
        SELECT 1 FROM prescriptions p
         WHERE p.patient_id = 'b0000000-0000-4000-8000-000000000001'::uuid
           AND p.diagnosis = 'Atrial Fibrillation with Hypertension'
   );

-- Cohort B triage vitals (no admission required — patient_id only)
INSERT INTO vitals (patient_id, temperature, pulse, bp_systolic, bp_diastolic, spo2, recorded_by, recorded_at)
SELECT 'b0000000-0000-4000-8000-000000000001'::uuid, 98.2, 78, 142, 88, 96,
       (SELECT id FROM users WHERE username = 'nurse_demo'), now() - INTERVAL '35 minutes'
 WHERE NOT EXISTS (
        SELECT 1 FROM vitals vy
         WHERE vy.patient_id = 'b0000000-0000-4000-8000-000000000001'::uuid
           AND vy.admission_id IS NULL
   );

-- ---------------------------------------------------------------------
-- 7. COHORT C — Diagnostics: 2 pending labs, 1 completed lab w/ analyzer
--    parameters, 1 pending radiology order
-- ---------------------------------------------------------------------
INSERT INTO lab_test_types (name, price, normal_range, hospital_id, is_active)
SELECT 'Liver Function Test (LFT)', 650.00, 'N/A', 1, true
 WHERE NOT EXISTS (SELECT 1 FROM lab_test_types ltt WHERE ltt.name = 'Liver Function Test (LFT)' AND ltt.hospital_id = 1);

INSERT INTO lab_orders (patient_id, test_type_id, test_name, ordered_by, ordered_at, priority, status, hospital_id, notes)
SELECT v.patient_id,
       (SELECT id FROM lab_test_types ltt WHERE ltt.name = v.test_name AND ltt.hospital_id = 1 LIMIT 1),
       v.test_name, (SELECT id FROM users WHERE username = 'doctor_demo'),
       v.ordered_at, v.priority, v.status, 1, v.notes
  FROM (VALUES
        ('c0000000-0000-4000-8000-000000000001'::uuid, 'Complete Blood Count (CBC)',   now() - INTERVAL '4 hours',  'Routine', 'Pending',   'Rule out dengue — sample collected at 08:15'),
        ('c0000000-0000-4000-8000-000000000002'::uuid, 'Liver Function Test (LFT)',    now() - INTERVAL '3 hours',  'Routine', 'Pending',   'Screening before starting statin therapy'),
        ('c0000000-0000-4000-8000-000000000003'::uuid, 'Complete Blood Count (CBC)',   now() - INTERVAL '26 hours', 'Routine', 'Completed', 'Analyzer Sysmex XN-1000, verified by pathologist')
       ) AS v(patient_id, test_name, ordered_at, priority, status, notes)
 WHERE NOT EXISTS (
        SELECT 1 FROM lab_orders lo
         WHERE lo.patient_id = v.patient_id AND lo.test_name = v.test_name
   );

-- Analyzer parameters for the completed CBC (laboratory result view)
UPDATE lab_orders
   SET results = '{"analyzer":"Sysmex XN-1000","verified_by":"Dr. S. Kadam (Pathology)","parameters":[{"key":"hb","label":"Haemoglobin","value":14.2,"unit":"g/dL","ref":"13.0-17.0"},{"key":"wbc","label":"Total Leucocyte Count","value":8600,"unit":"/uL","ref":"4000-11000"},{"key":"plt","label":"Platelet Count","value":245000,"unit":"/uL","ref":"150000-450000"},{"key":"hct","label":"Haematocrit","value":42.5,"unit":"%","ref":"40-50"},{"key":"mcv","label":"MCV","value":88.4,"unit":"fL","ref":"83-101"}]}'::jsonb
 WHERE patient_id = 'c0000000-0000-4000-8000-000000000003'::uuid
   AND test_name = 'Complete Blood Count (CBC)';

INSERT INTO lab_parameters (test_name, param_key, param_label, param_type, unit, reference_min, reference_max, category, display_order, is_required)
SELECT v.test_name, v.param_key, v.param_label, 'number', v.unit, v.ref_min, v.ref_max, v.category, v.ord, true
  FROM (VALUES
        ('Complete Blood Count (CBC)', 'hb',  'Haemoglobin',           'g/dL', 13.0, 17.0, 'Haematology', 1),
        ('Complete Blood Count (CBC)', 'wbc', 'Total Leucocyte Count', '/uL',  4000, 11000, 'Haematology', 2),
        ('Complete Blood Count (CBC)', 'plt', 'Platelet Count',        '/uL',  150000, 450000, 'Haematology', 3),
        ('Liver Function Test (LFT)',  'tbil','Total Bilirubin',       'mg/dL', 0.3, 1.2, 'Biochemistry', 1),
        ('Liver Function Test (LFT)',  'sgpt','SGPT (ALT)',            'U/L',  10, 40, 'Biochemistry', 2),
        ('Liver Function Test (LFT)',  'sgot','SGOT (AST)',            'U/L',  10, 40, 'Biochemistry', 3)
       ) AS v(test_name, param_key, param_label, unit, ref_min, ref_max, category, ord)
 WHERE NOT EXISTS (
        SELECT 1 FROM lab_parameters lp WHERE lp.test_name = v.test_name AND lp.param_key = v.param_key
   );

INSERT INTO radiology_orders (hospital_id, patient_id, accession_number, modality, status, priority, study_description, clinical_history, scheduled_date)
SELECT 1, 'c0000000-0000-4000-8000-000000000004'::uuid, 'RAD-DEMO-2026-0001', 'CR', 'Scheduled', 'Routine',
       'Chest X-Ray PA View', 'Chronic obstructive pulmonary disease — acute exacerbation, rule out consolidation', now() - INTERVAL '90 minutes'
 WHERE NOT EXISTS (
        SELECT 1 FROM radiology_orders ro WHERE ro.accession_number = 'RAD-DEMO-2026-0001'
   );

-- The Lab module (server/controllers/labController.js) reads `lab_requests`, NOT
-- `lab_orders` — both are populated so the worklist and the IPD order feed agree.
INSERT INTO lab_requests (patient_id, test_type_id, test_name, doctor_id, status, requested_at, priority, hospital_id, notes, payment_status, payment_amount)
SELECT v.patient_id,
       (SELECT id FROM lab_test_types ltt WHERE ltt.name = v.test_name AND ltt.hospital_id = 1 LIMIT 1),
       v.test_name, (SELECT id FROM users WHERE username = 'doctor_demo'),
       v.status, v.requested_at, v.priority, 1, v.notes, 'Pending', 0
  FROM (VALUES
        ('c0000000-0000-4000-8000-000000000001'::uuid, 'Complete Blood Count (CBC)', now() - INTERVAL '4 hours',  'Routine', 'Pending',   'Rule out dengue — sample collected at 08:15'),
        ('c0000000-0000-4000-8000-000000000002'::uuid, 'Liver Function Test (LFT)',  now() - INTERVAL '3 hours',  'Routine', 'Pending',   'Screening before starting statin therapy'),
        ('c0000000-0000-4000-8000-000000000003'::uuid, 'Complete Blood Count (CBC)', now() - INTERVAL '26 hours', 'Routine', 'Completed', 'Analyzer Sysmex XN-1000, verified by pathologist')
       ) AS v(patient_id, test_name, requested_at, priority, status, notes)
 WHERE NOT EXISTS (
        SELECT 1 FROM lab_requests lr
         WHERE lr.patient_id = v.patient_id AND lr.test_name = v.test_name
   );

UPDATE lab_requests
   SET result_json = '{"analyzer":"Sysmex XN-1000","verified_by":"Dr. S. Kadam (Pathology)","parameters":[{"key":"hb","label":"Haemoglobin","value":14.2,"unit":"g/dL","ref":"13.0-17.0"},{"key":"wbc","label":"Total Leucocyte Count","value":8600,"unit":"/uL","ref":"4000-11000"},{"key":"plt","label":"Platelet Count","value":245000,"unit":"/uL","ref":"150000-450000"},{"key":"hct","label":"Haematocrit","value":42.5,"unit":"%","ref":"40-50"},{"key":"mcv","label":"MCV","value":88.4,"unit":"fL","ref":"83-101"}]}'::jsonb,
       report_generated_at = now() - INTERVAL '20 hours',
       sample_collected = true,
       sample_collected_at = now() - INTERVAL '25 hours'
 WHERE patient_id = 'c0000000-0000-4000-8000-000000000003'::uuid
   AND test_name = 'Complete Blood Count (CBC)';

-- ---------------------------------------------------------------------
-- 8. COHORT D — IPD & ICU: 3 admitted patients, ICU beds assigned,
--    24h hourly vitals telemetry, unbilled pharmacy items
-- ---------------------------------------------------------------------
INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, hospital_id, current_diet, ipd_number, treating_doctor_id, diagnosis, notes, payment_mode)
VALUES
  ('d0000000-0000-4000-8000-000000000001'::uuid, 'ICU', 'ICU-01', 'Admitted', now() - INTERVAL '31 hours', 1, 'Cardiac',  'IPD-DEMO-2026-0001', (SELECT id FROM users WHERE username = 'doctor_demo'), 'Acute coronary syndrome — post PCI monitoring', 'Telemetry continuous, serial troponin trending down', 'INSURANCE'),
  ('d0000000-0000-4000-8000-000000000002'::uuid, 'ICU', 'ICU-02', 'Admitted', now() - INTERVAL '19 hours', 1, 'Liquid',   'IPD-DEMO-2026-0002', (SELECT id FROM users WHERE username = 'doctor_demo'), 'Post-operative day 1 — laparoscopic cholecystectomy', 'Pain controlled, ambulating with support', 'SELF_PAY'),
  ('d0000000-0000-4000-8000-000000000003'::uuid, 'ICU', 'ICU-03', 'Admitted', now() - INTERVAL '9 hours',  1, 'Renal',    'IPD-DEMO-2026-0003', (SELECT id FROM users WHERE username = 'doctor_demo'), 'Chronic kidney disease stage 4 with fluid overload', 'Nephrology review requested, strict intake-output charting', 'SELF_PAY')
ON CONFLICT (ipd_number, hospital_id) DO UPDATE
   SET patient_id = EXCLUDED.patient_id,
       ward = EXCLUDED.ward,
       bed_number = EXCLUDED.bed_number,
       status = 'Admitted',
       hospital_id = EXCLUDED.hospital_id,
       treating_doctor_id = EXCLUDED.treating_doctor_id,
       diagnosis = EXCLUDED.diagnosis,
       notes = EXCLUDED.notes,
       updated_at = now();

UPDATE beds b
   SET status = 'Occupied', current_admission_id = a.id
  FROM admissions a
 WHERE a.ipd_number IN ('IPD-DEMO-2026-0001', 'IPD-DEMO-2026-0002', 'IPD-DEMO-2026-0003')
   AND a.hospital_id = 1
   AND b.ward_id = (SELECT id FROM wards WHERE name = 'ICU' AND hospital_id = 1)
   AND b.bed_number = a.bed_number;

UPDATE wards w
   SET total_beds = GREATEST(w.total_beds, 6),
       occupied_beds = 3,
       available_beds = GREATEST(w.total_beds, 6) - 3
 WHERE w.name = 'ICU' AND w.hospital_id = 1;

INSERT INTO vitals (admission_id, patient_id, temperature, pulse, bp_systolic, bp_diastolic, spo2, recorded_by, recorded_at)
SELECT a.id, a.patient_id,
       98.0 + ((g % 5) * 0.4),
       68 + ((g * 3) % 22),
       108 + ((g * 7) % 30),
       66 + ((g * 5) % 16),
       94 + (g % 5),
       (SELECT id FROM users WHERE username = 'nurse_demo'),
       now() - (g || ' hours')::interval
  FROM admissions a
  CROSS JOIN generate_series(0, 23) AS g
 WHERE a.ipd_number IN ('IPD-DEMO-2026-0001', 'IPD-DEMO-2026-0002', 'IPD-DEMO-2026-0003')
   AND a.hospital_id = 1
   AND NOT EXISTS (
        SELECT 1 FROM vitals v
         WHERE v.admission_id = a.id
           AND v.recorded_at > now() - INTERVAL '24 hours'
   );

INSERT INTO pharmacy_orders (order_number, patient_id, admission_id, status, payment_status, total_amount, created_by, notes)
SELECT v.order_number, v.patient_id, a.id, 'Pending', 'Unpaid', v.total, (SELECT id FROM users WHERE username = 'pharmacist'), v.notes
  FROM (VALUES
        ('PHR-DEMO-2026-0001', 'd0000000-0000-4000-8000-000000000001'::uuid, 'IPD-DEMO-2026-0001', 1840.00, 'Unbilled ICU medication — awaiting IPD billing cycle'),
        ('PHR-DEMO-2026-0002', 'd0000000-0000-4000-8000-000000000002'::uuid, 'IPD-DEMO-2026-0002', 960.00,  'Post-operative analgesia — unbilled'),
        ('PHR-DEMO-2026-0003', 'd0000000-0000-4000-8000-000000000003'::uuid, 'IPD-DEMO-2026-0003', 2410.00, 'Renal protocol fluids — unbilled')
       ) AS v(order_number, patient_id, ipd_number, total, notes)
  JOIN admissions a ON a.ipd_number = v.ipd_number AND a.hospital_id = 1
 WHERE NOT EXISTS (SELECT 1 FROM pharmacy_orders po WHERE po.order_number = v.order_number);

INSERT INTO pharmacy_order_items (order_id, medicine_name, batch_number, quantity, unit_price, total_price)
SELECT po.id, v.medicine_name, v.batch_number, v.qty, v.rate, v.qty * v.rate
  FROM (VALUES
        ('PHR-DEMO-2026-0001', 'Aspirin 75mg Tablet',    'ASP2401', 30, 2.50,  0),
        ('PHR-DEMO-2026-0001', 'Atorvastatin 40mg',      'ATV2402', 30, 12.00, 0),
        ('PHR-DEMO-2026-0001', 'Enoxaparin 40mg Inj',    'ENX2403', 4,  265.00, 0),
        ('PHR-DEMO-2026-0002', 'Paracetamol 1g IV',      'PCM2404', 6,  85.00,  0),
        ('PHR-DEMO-2026-0002', 'Ondansetron 4mg Inj',    'OND2405', 3,  75.00,  0),
        ('PHR-DEMO-2026-0003', 'Normal Saline 500ml',    'NSL2406', 4,  115.00, 0),
        ('PHR-DEMO-2026-0003', 'Furosemide 40mg Inj',    'FUR2407', 6,  95.00,  0),
        ('PHR-DEMO-2026-0003', 'Sodium Bicarbonate 8.4%','BIC2408', 4,  310.00, 0)
       ) AS v(order_number, medicine_name, batch_number, qty, rate, dummy)
  JOIN pharmacy_orders po ON po.order_number = v.order_number
 WHERE NOT EXISTS (
        SELECT 1 FROM pharmacy_order_items poi
         WHERE poi.order_id = po.id AND poi.medicine_name = v.medicine_name
   );

-- ---------------------------------------------------------------------
-- 9. COHORT E — Emergency & Billing
--   E1 Ganesh Pawar  : resolved CODE_BLUE, 2 hours ago
--   E2 Sneha Bhat    : fully paid invoice + payment receipt
--   E3 Ramesh Yadav  : pending multi-item invoice (OPD + Lab + Pharmacy)
-- ---------------------------------------------------------------------
INSERT INTO emergency_events (event_code, event_type, location, severity, description, triggered_by, status, triggered_at, resolved_at, resolved_by, resolution_notes, hospital_id)
SELECT 'CODE_BLUE-DEMO-0001', 'CODE_BLUE', 'Emergency Ward — Resuscitation Bay 1', 'Critical',
       'Patient collapsed with ventricular tachycardia, CPR initiated, ROSC achieved after 2 cycles',
       (SELECT id FROM users WHERE username = 'nurse_demo'), 'Resolved', now() - INTERVAL '2 hours', now() - INTERVAL '110 minutes',
       (SELECT id FROM users WHERE username = 'doctor_demo'),
       'Restored spontaneous circulation, shifted to ICU on Amiodarone infusion', 1
 WHERE NOT EXISTS (SELECT 1 FROM emergency_events ee WHERE ee.event_code = 'CODE_BLUE-DEMO-0001');

-- E2: fully paid invoice
INSERT INTO invoices (patient_id, total_amount, status, invoice_number, amount_paid, patient_number, hospital_id, generated_by, due_date)
SELECT 'e0000000-0000-4000-8000-000000000002'::uuid, 4850.00, 'Paid', 'INV-DEMO-2026-0001', 4850.00, 'UHID-DEMO-0014', 1,
       (SELECT id FROM users WHERE username = 'admin'), CURRENT_DATE
 WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.invoice_number = 'INV-DEMO-2026-0001');

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id, item_type)
SELECT i.id, v.description, v.qty, v.rate, v.qty * v.rate, 1, v.item_type
  FROM invoices i
  CROSS JOIN (VALUES
        ('OPD Consultation — General Medicine', 1, 700.00,  'consultation'),
        ('Complete Blood Count (CBC)',          1, 450.00,  'lab'),
        ('Amoxicillin 500mg Capsule',          10, 9.50,    'pharmacy'),
        ('Pantoprazole 40mg Tablet',           14, 7.00,    'pharmacy'),
        ('Paracetamol 650mg Tablet',           15, 2.10,    'pharmacy'),
        ('Wound Dressing — Minor Procedure',    1, 1800.00, 'procedure')
       ) AS v(description, qty, rate, item_type)
 WHERE i.invoice_number = 'INV-DEMO-2026-0001'
   AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.description = v.description);

INSERT INTO payments (invoice_id, amount, payment_mode, reference_number, received_by, hospital_id, patient_id, status)
SELECT i.id, 4850.00, 'UPI', 'UPI-DEMO-773412', (SELECT id FROM users WHERE username = 'receptionist_user'), 1,
       'e0000000-0000-4000-8000-000000000002'::uuid, 'Completed'
  FROM invoices i
 WHERE i.invoice_number = 'INV-DEMO-2026-0001'
   AND NOT EXISTS (SELECT 1 FROM payments py WHERE py.invoice_id = i.id);

-- E3: pending multi-item invoice (OPD + Lab + Pharmacy)
INSERT INTO invoices (patient_id, total_amount, status, invoice_number, amount_paid, patient_number, hospital_id, generated_by, due_date)
SELECT 'e0000000-0000-4000-8000-000000000003'::uuid, 5250.00, 'Pending', 'INV-DEMO-2026-0002', 0.00, 'UHID-DEMO-0015', 1,
       (SELECT id FROM users WHERE username = 'admin'), CURRENT_DATE + 7
 WHERE NOT EXISTS (SELECT 1 FROM invoices i WHERE i.invoice_number = 'INV-DEMO-2026-0002');

INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id, item_type)
SELECT i.id, v.description, v.qty, v.rate, v.qty * v.rate, 1, v.item_type
  FROM invoices i
  CROSS JOIN (VALUES
        ('OPD Consultation — Orthopaedics',      1,  900.00, 'consultation'),
        ('Complete Blood Count (CBC)',           1,  450.00, 'lab'),
        ('Liver Function Test (LFT)',            1,  650.00, 'lab'),
        ('Diclofenac 50mg Tablet',              20,  3.40,  'pharmacy'),
        ('Calcium + Vitamin D3 Tablet',         30,  11.00, 'pharmacy'),
        ('Cefixime 200mg Tablet',               10,  24.00, 'pharmacy')
       ) AS v(description, qty, rate, item_type)
 WHERE i.invoice_number = 'INV-DEMO-2026-0002'
   AND NOT EXISTS (SELECT 1 FROM invoice_items ii WHERE ii.invoice_id = i.id AND ii.description = v.description);

-- ---------------------------------------------------------------------
-- 10. Pharmacy stock — positive batches for the demo drugs
-- ---------------------------------------------------------------------
INSERT INTO inventory_items (name, batch_number, expiry_date, stock_quantity, reorder_level, price_per_unit, hospital_id, generic_name, category, manufacturer, rack_location, hsn_code, is_controlled)
VALUES
  ('Amoxicillin 500mg Capsule',   'AMX2401', CURRENT_DATE + 420, 480, 50,  9.50,   1, 'Amoxicillin',        'Antibiotic',    'Cipla Ltd',          'A-01', '3004', false),
  ('Pantoprazole 40mg Tablet',    'PAN2402', CURRENT_DATE + 500, 620, 60,  7.00,   1, 'Pantoprazole',       'Gastro',        'Sun Pharma',         'A-02', '3004', false),
  ('Paracetamol 650mg Tablet',    'PCM2403', CURRENT_DATE + 300, 900, 100, 2.10,   1, 'Paracetamol',        'Analgesic',     'Micro Labs',         'A-03', '3004', false),
  ('Cefixime 200mg Tablet',       'CEF2404', CURRENT_DATE + 380, 350, 40,  24.00,  1, 'Cefixime',           'Antibiotic',    'Alkem Labs',         'A-04', '3004', false),
  ('Diclofenac 50mg Tablet',      'DIC2405', CURRENT_DATE + 350, 540, 60,  3.40,   1, 'Diclofenac Sodium',  'Analgesic',     'Novartis India',     'A-05', '3004', false),
  ('Calcium + Vitamin D3 Tablet', 'CAL2406', CURRENT_DATE + 600, 410, 50,  11.00,  1, 'Calcium Carbonate',  'Supplement',    'Abbott India',       'A-06', '3004', false),
  ('Warfarin 5mg Tablet',         'WAR2407', CURRENT_DATE + 450, 260, 30,  6.80,   1, 'Warfarin Sodium',    'Anticoagulant', 'Zydus Healthcare',   'B-01', '3004', false),
  ('Aspirin 75mg Tablet',         'ASP2408', CURRENT_DATE + 400, 700, 80,  2.50,   1, 'Acetylsalicylic Acid','Antiplatelet', 'USV Pvt Ltd',        'B-02', '3004', false),
  ('Metoprolol 25mg Tablet',      'MET2409', CURRENT_DATE + 420, 380, 40,  5.20,   1, 'Metoprolol',         'Cardiac',       'AstraZeneca Pharma', 'B-03', '3004', false),
  ('Ciprofloxacin 500mg Tablet',  'CIP2410', CURRENT_DATE + 360, 300, 35,  12.60,  1, 'Ciprofloxacin',      'Antibiotic',    'Dr Reddys Labs',     'B-04', '3004', false),
  ('Normal Saline 500ml',         'NSL2411', CURRENT_DATE + 540, 640, 60,  115.00, 1, 'Sodium Chloride 0.9%','IV Fluid',     'Baxter India',       'C-01', '3005', false),
  ('Enoxaparin 40mg Injection',   'ENX2412', CURRENT_DATE + 330, 120, 20,  265.00, 1, 'Enoxaparin Sodium',  'Anticoagulant', 'Sanofi India',       'C-02', '3004', false)
ON CONFLICT (name, hospital_id) DO UPDATE
   SET batch_number = EXCLUDED.batch_number,
       expiry_date = EXCLUDED.expiry_date,
       stock_quantity = EXCLUDED.stock_quantity,
       reorder_level = EXCLUDED.reorder_level,
       price_per_unit = EXCLUDED.price_per_unit,
       generic_name = EXCLUDED.generic_name,
       category = EXCLUDED.category,
       manufacturer = EXCLUDED.manufacturer,
       rack_location = EXCLUDED.rack_location;

COMMIT;
