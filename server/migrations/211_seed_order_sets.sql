-- WOLF HMS - Order Sets Seed Data
-- =============================================
-- Seed clinical order sets for doctor quick-orders
-- =============================================
-- Clear existing (if re-running)
DELETE FROM order_sets
WHERE name IN (
        'Sepsis Bundle',
        'Post-Op Day 1 Orders',
        'Chest Pain Workup',
        'DKA Protocol'
    );
-- Insert Order Sets
INSERT INTO order_sets (name, category, description, items_json)
VALUES (
        'Sepsis Bundle',
        'Emergency',
        'Initial sepsis management bundle - 1 hour target',
        '[
        {"type": "lab", "test_name": "CBC with Differential", "priority": "STAT"},
        {"type": "lab", "test_name": "Blood Culture x2", "priority": "STAT"},
        {"type": "lab", "test_name": "Lactate", "priority": "STAT"},
        {"type": "lab", "test_name": "BMP", "priority": "STAT"},
        {"type": "medication", "drug_name": "Normal Saline", "dosage": "30ml/kg", "frequency": "IV Bolus", "duration": "STAT"},
        {"type": "medication", "drug_name": "Ceftriaxone", "dosage": "2g", "frequency": "IV", "duration": "Once"},
        {"type": "instruction", "instruction": "Insert Foley catheter for urine output monitoring"}
    ]'::jsonb
    ),
    (
        'Post-Op Day 1 Orders',
        'Surgery',
        'Standard post-operative care orders',
        '[
        {"type": "medication", "drug_name": "Paracetamol", "dosage": "1g", "frequency": "Q6H PRN", "duration": "3 days"},
        {"type": "medication", "drug_name": "Pantoprazole", "dosage": "40mg", "frequency": "OD", "duration": "5 days"},
        {"type": "medication", "drug_name": "Ondansetron", "dosage": "4mg", "frequency": "Q8H PRN", "duration": "2 days"},
        {"type": "instruction", "instruction": "Clear liquids, advance diet as tolerated"},
        {"type": "instruction", "instruction": "Ambulate TID with assistance"},
        {"type": "instruction", "instruction": "Incentive spirometry Q2H while awake"},
        {"type": "lab", "test_name": "CBC", "priority": "Routine"}
    ]'::jsonb
    ),
    (
        'Chest Pain Workup',
        'Cardiology',
        'ACS rule-out protocol',
        '[
        {"type": "lab", "test_name": "Troponin I", "priority": "STAT"},
        {"type": "lab", "test_name": "ECG 12-lead", "priority": "STAT"},
        {"type": "lab", "test_name": "BNP", "priority": "STAT"},
        {"type": "lab", "test_name": "D-Dimer", "priority": "STAT"},
        {"type": "medication", "drug_name": "Aspirin", "dosage": "325mg", "frequency": "STAT", "duration": "Once"},
        {"type": "medication", "drug_name": "Nitroglycerin", "dosage": "0.4mg", "frequency": "SL PRN", "duration": "As needed"},
        {"type": "instruction", "instruction": "Continuous cardiac monitoring"},
        {"type": "instruction", "instruction": "Notify physician if chest pain recurs"}
    ]'::jsonb
    ),
    (
        'DKA Protocol',
        'Endocrine',
        'Diabetic Ketoacidosis management',
        '[
        {"type": "lab", "test_name": "Blood Glucose", "priority": "STAT"},
        {"type": "lab", "test_name": "ABG", "priority": "STAT"},
        {"type": "lab", "test_name": "BMP", "priority": "STAT"},
        {"type": "lab", "test_name": "Serum Ketones", "priority": "STAT"},
        {"type": "medication", "drug_name": "Regular Insulin", "dosage": "0.1 units/kg/hr", "frequency": "Continuous IV", "duration": "Until resolved"},
        {"type": "medication", "drug_name": "Normal Saline", "dosage": "1000ml/hr", "frequency": "IV", "duration": "First 2 hours"},
        {"type": "medication", "drug_name": "Potassium Chloride", "dosage": "20mEq", "frequency": "Per protocol", "duration": "As needed"},
        {"type": "instruction", "instruction": "Hourly blood glucose monitoring"},
        {"type": "instruction", "instruction": "Strict I/O charting"}
    ]'::jsonb
    );
-- Verify
SELECT name,
    category
FROM order_sets;