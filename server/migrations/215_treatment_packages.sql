-- =============================================
-- TREATMENT PACKAGES - All-Inclusive Hospital Bundles
-- Wolf HMS Migration 215
-- =============================================
-- 1. Master Package Definition
CREATE TABLE IF NOT EXISTS treatment_packages (
    id SERIAL PRIMARY KEY,
    code VARCHAR(30) UNIQUE NOT NULL,
    -- "MAT-ND-01", "SUR-APP-01"
    name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    -- "Maternity", "Surgery", "DayCare", "Dialysis"
    specialty VARCHAR(100),
    -- "Obstetrics", "General Surgery", "Nephrology"
    description TEXT,
    -- Pricing
    base_price DECIMAL(12, 2) NOT NULL,
    -- Package price
    gst_percent DECIMAL(4, 2) DEFAULT 0,
    discount_allowed BOOLEAN DEFAULT true,
    -- Can discount be applied?
    max_discount_percent DECIMAL(4, 2) DEFAULT 15,
    -- Duration & Accommodation
    stay_days INTEGER DEFAULT 0,
    -- Expected hospital stay
    room_type VARCHAR(50) DEFAULT 'Ward',
    -- "Ward", "Semi-Private", "Private", "Deluxe"
    icu_days INTEGER DEFAULT 0,
    -- ICU days included
    -- Inclusions (JSONB for flexibility)
    inclusions JSONB DEFAULT '[]',
    -- ["Nursing care", "Medicines", "Lab tests"]
    exclusions JSONB DEFAULT '[]',
    -- ["Blood transfusion", "NICU charges"]
    terms_conditions TEXT,
    -- Fine print
    -- Insurance & Government Schemes
    tpa_eligible BOOLEAN DEFAULT true,
    pmjay_code VARCHAR(30),
    -- If mapped to PMJAY package
    rohini_code VARCHAR(30),
    -- If mapped to Rohini code
    -- Validity
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    -- Status
    is_active BOOLEAN DEFAULT true,
    hospital_id INTEGER DEFAULT 1,
    -- Multi-tenant
    -- Audit
    created_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_pkg_category ON treatment_packages(category);
CREATE INDEX IF NOT EXISTS idx_pkg_hospital ON treatment_packages(hospital_id);
CREATE INDEX IF NOT EXISTS idx_pkg_active ON treatment_packages(is_active);
-- 2. Package Items - Detailed breakdown of what's included
CREATE TABLE IF NOT EXISTS package_items (
    id SERIAL PRIMARY KEY,
    package_id INTEGER REFERENCES treatment_packages(id) ON DELETE CASCADE,
    -- Item Details
    item_type VARCHAR(50) NOT NULL,
    -- "room", "medicine", "lab", "procedure", "consultation", "meal"
    item_category VARCHAR(100),
    -- Sub-category
    item_id INTEGER,
    -- Reference to specific item (optional)
    item_name VARCHAR(255) NOT NULL,
    -- Description
    item_code VARCHAR(50),
    -- Reference code if any
    -- Quantity & Pricing
    quantity INTEGER DEFAULT 1,
    unit VARCHAR(30),
    -- "days", "units", "doses", "sessions"
    unit_price DECIMAL(10, 2) DEFAULT 0,
    -- Individual price (for reference)
    -- Inclusion Status
    included_in_package BOOLEAN DEFAULT true,
    -- False = extra charge applies
    extra_charge DECIMAL(10, 2) DEFAULT 0,
    -- If not included, the extra amount
    -- Notes
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pkg_items_package ON package_items(package_id);
CREATE INDEX IF NOT EXISTS idx_pkg_items_type ON package_items(item_type);
-- 3. Patient Package Assignment
CREATE TABLE IF NOT EXISTS patient_packages (
    id SERIAL PRIMARY KEY,
    -- References
    patient_id UUID NOT NULL,
    admission_id INTEGER,
    -- Link to IPD admission
    package_id INTEGER REFERENCES treatment_packages(id),
    -- Pricing at time of assignment
    package_price DECIMAL(12, 2),
    -- Original package price
    discount_percent DECIMAL(4, 2) DEFAULT 0,
    discount_amount DECIMAL(12, 2) DEFAULT 0,
    final_price DECIMAL(12, 2),
    -- After discount
    -- Advance Payment
    advance_paid DECIMAL(12, 2) DEFAULT 0,
    -- Status
    status VARCHAR(30) DEFAULT 'active',
    -- "active", "completed", "cancelled", "expired"
    -- Duration
    start_date DATE,
    expected_end_date DATE,
    actual_end_date DATE,
    -- Extras consumed beyond package
    extras_count INTEGER DEFAULT 0,
    extras_amount DECIMAL(12, 2) DEFAULT 0,
    -- Final Settlement
    total_billed DECIMAL(12, 2),
    -- Package + Extras
    total_paid DECIMAL(12, 2),
    balance_due DECIMAL(12, 2),
    -- Notes
    notes TEXT,
    -- Audit
    assigned_by INTEGER,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_patient_pkg_patient ON patient_packages(patient_id);
CREATE INDEX IF NOT EXISTS idx_patient_pkg_admission ON patient_packages(admission_id);
CREATE INDEX IF NOT EXISTS idx_patient_pkg_status ON patient_packages(status);
-- 4. Package Extras - Items consumed beyond package
CREATE TABLE IF NOT EXISTS package_extras (
    id SERIAL PRIMARY KEY,
    patient_package_id INTEGER REFERENCES patient_packages(id) ON DELETE CASCADE,
    -- Extra Item Details
    item_type VARCHAR(50) NOT NULL,
    -- "medicine", "lab", "procedure", "blood", "icu"
    item_name VARCHAR(255) NOT NULL,
    item_id INTEGER,
    -- Reference if applicable
    -- Billing
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2),
    total_price DECIMAL(10, 2),
    -- Reason
    reason TEXT,
    -- Why extra was needed
    -- Status
    is_billed BOOLEAN DEFAULT false,
    invoice_id INTEGER,
    -- Audit
    logged_by INTEGER,
    logged_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pkg_extras_patient ON package_extras(patient_package_id);
-- 5. Seed Common Treatment Packages
INSERT INTO treatment_packages (
        code,
        name,
        category,
        specialty,
        base_price,
        stay_days,
        room_type,
        icu_days,
        inclusions,
        exclusions,
        description
    )
VALUES -- Maternity Packages
    (
        'MAT-ND-01',
        'Normal Delivery Package - Ward',
        'Maternity',
        'Obstetrics & Gynecology',
        25000.00,
        3,
        'Ward',
        0,
        '["Delivery charges", "Ward bed (3 days)", "Nursing care 24x7", "Standard medicines", "Baby care & vaccination", "Doctor rounds", "Basic lab tests", "Meals for patient"]',
        '["NICU charges", "Blood transfusion", "Special procedures", "Emergency C-section conversion", "Epidural anesthesia"]',
        'Complete normal delivery package with 3-day ward stay. Includes all routine care for mother and baby.'
    ),
    (
        'MAT-ND-02',
        'Normal Delivery Package - Private',
        'Maternity',
        'Obstetrics & Gynecology',
        40000.00,
        3,
        'Private',
        0,
        '["Delivery charges", "Private room (3 days)", "Nursing care 24x7", "All medicines", "Baby care & vaccination", "Doctor rounds (2/day)", "Lab tests", "Meals for patient & 1 attendant", "TV & AC room"]',
        '["NICU charges", "Blood transfusion", "Emergency C-section conversion", "Epidural (available at extra cost)"]',
        'Premium normal delivery package with private room and enhanced amenities.'
    ),
    (
        'MAT-CS-01',
        'C-Section Package - Ward',
        'Maternity',
        'Obstetrics & Gynecology',
        55000.00,
        5,
        'Ward',
        1,
        '["LSCS surgery", "OT charges", "Anesthesia", "Ward bed (5 days)", "ICU/HDU (1 day mother)", "Nursing care", "All medicines", "Baby care", "Doctor rounds", "Lab tests", "Meals"]',
        '["NICU charges beyond 24hrs", "Blood products", "Extended ICU stay", "Special investigations"]',
        'Cesarean section package with surgery, 5-day stay, and 1-day ICU coverage.'
    ),
    (
        'MAT-CS-02',
        'C-Section Package - Deluxe',
        'Maternity',
        'Obstetrics & Gynecology',
        95000.00,
        5,
        'Deluxe',
        1,
        '["LSCS surgery", "OT charges", "Anesthesia", "Deluxe suite (5 days)", "ICU (1 day)", "Personal nurse", "All medicines", "Baby care & NICU (24hrs)", "Consultant rounds (3/day)", "All investigations", "Gourmet meals", "Jacuzzi room"]',
        '["Extended NICU beyond 24hrs", "Blood products", "Neonatal surgery"]',
        'Premium C-section experience with deluxe suite and personal care.'
    ),
    -- Surgery Packages
    (
        'SUR-APP-01',
        'Appendectomy - Laparoscopic',
        'Surgery',
        'General Surgery',
        50000.00,
        2,
        'Ward',
        0,
        '["Laparoscopic surgery", "OT charges", "Anesthesia", "Ward bed (2 days)", "Medicines", "Doctor rounds", "Dressings", "Pre-op investigations"]',
        '["Open surgery conversion", "ICU admission", "Blood transfusion", "Post-op complications"]',
        'Minimally invasive appendix removal with quick recovery.'
    ),
    (
        'SUR-HRN-01',
        'Hernia Repair - Laparoscopic',
        'Surgery',
        'General Surgery',
        60000.00,
        2,
        'Ward',
        0,
        '["Laparoscopic surgery", "Mesh implant (standard)", "OT & Anesthesia", "Ward (2 days)", "Medicines", "Follow-up visit"]',
        '["Premium mesh upgrade", "Bilateral hernia (extra charge)", "Open conversion"]',
        'Single-side inguinal hernia repair with mesh.'
    ),
    (
        'SUR-CHOL-01',
        'Cholecystectomy - Laparoscopic',
        'Surgery',
        'General Surgery',
        55000.00,
        2,
        'Ward',
        0,
        '["Lap Cholecystectomy", "OT charges", "Anesthesia", "Ward (2 days)", "Medicines", "Investigations", "Follow-up"]',
        '["ERCP if needed", "Open conversion", "Stone spillage complications"]',
        'Laparoscopic gallbladder removal.'
    ),
    -- Day Care Packages
    (
        'DAY-CAT-01',
        'Cataract Surgery - Phaco (per eye)',
        'DayCare',
        'Ophthalmology',
        25000.00,
        0,
        'Day Care',
        0,
        '["Phacoemulsification surgery", "Standard IOL lens", "OT charges", "Medicines (1 week)", "Eye protective shield", "Follow-up visits (3)"]',
        '["Premium/Toric/Multifocal IOL (upgrade available)", "Second eye", "Complications requiring admission"]',
        'Modern cataract surgery with standard monofocal IOL. Day care procedure.'
    ),
    (
        'DAY-END-01',
        'Endoscopy - Upper GI',
        'DayCare',
        'Gastroenterology',
        8000.00,
        0,
        'Day Care',
        0,
        '["UGI Endoscopy", "Sedation", "Biopsy (if routine)", "Recovery room", "Report"]',
        '["Therapeutic procedures", "Polypectomy", "Admission if complications"]',
        'Diagnostic upper GI endoscopy under sedation.'
    ),
    (
        'DAY-COL-01',
        'Colonoscopy',
        'DayCare',
        'Gastroenterology',
        12000.00,
        0,
        'Day Care',
        0,
        '["Full colonoscopy", "Sedation", "Routine biopsy", "Recovery", "Photo report"]',
        '["Polypectomy", "Therapeutic interventions", "Bowel prep medicines"]',
        'Complete colonoscopy with biopsy.'
    ),
    -- Dialysis Packages
    (
        'DIA-HD-01',
        'Hemodialysis - Single Session',
        'Dialysis',
        'Nephrology',
        2000.00,
        0,
        'Day Care',
        0,
        '["HD session (4 hours)", "Dialyzer", "Blood lines", "Monitoring", "Nursing care"]',
        '["EPO injection", "Iron sucrose", "Blood transfusion", "Emergency medicines"]',
        'Single hemodialysis session.'
    ),
    (
        'DIA-HD-12',
        'Hemodialysis - Monthly (12 sessions)',
        'Dialysis',
        'Nephrology',
        20000.00,
        0,
        'Day Care',
        0,
        '["12 HD sessions", "Dialyzers", "Blood lines", "Routine monitoring", "Monthly labs (basic)", "Dietician consult"]',
        '["EPO/ESA", "IV Iron", "Blood products", "Hospitalization", "Vascular access procedures"]',
        'Monthly dialysis package with 12 sessions and basic monitoring.'
    ),
    -- Health Checkup Packages
    (
        'CHK-EXEC-01',
        'Executive Health Checkup',
        'HealthCheck',
        'Preventive Medicine',
        4999.00,
        0,
        'Day Care',
        0,
        '["Physician consultation", "CBC, LFT, KFT, Lipid Profile", "Thyroid (TSH)", "Blood sugar (F & PP)", "Urine routine", "ECG", "Chest X-ray", "USG Abdomen", "Diet counseling"]',
        '["Specialized tests", "CT/MRI", "Stress test", "Follow-up consultations"]',
        'Comprehensive annual health checkup for executives.'
    ),
    (
        'CHK-CARDIAC-01',
        'Cardiac Wellness Package',
        'HealthCheck',
        'Cardiology',
        7999.00,
        0,
        'Day Care',
        0,
        '["Cardiologist consultation", "ECG", "2D Echo", "TMT/Stress test", "Lipid profile", "HbA1c", "Blood pressure monitoring"]',
        '["Angiography", "CT Coronary", "Holter monitoring"]',
        'Heart health assessment package.'
    ) ON CONFLICT (code) DO NOTHING;
-- Comments
COMMENT ON TABLE treatment_packages IS 'All-inclusive hospital treatment packages with fixed pricing';
COMMENT ON TABLE package_items IS 'Detailed breakdown of items included in each package';
COMMENT ON TABLE patient_packages IS 'Assignment of packages to patients during admission';
COMMENT ON TABLE package_extras IS 'Items consumed beyond package allowance, billed separately';