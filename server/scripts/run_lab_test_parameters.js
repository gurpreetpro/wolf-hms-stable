/**
 * Lab Test Parameters Migration
 * Creates database tables for dynamic test definitions and instrument mapping
 * Run: node run_lab_test_parameters.js
 */

const { Pool } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432
});

async function runMigration() {
    const client = await pool.connect();
    
    try {
        console.log('🔬 Lab Test Parameters Migration Starting...\n');
        await client.query('BEGIN');

        // 1. Create lab_test_parameters table
        console.log('📋 Creating lab_test_parameters table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS lab_test_parameters (
                id SERIAL PRIMARY KEY,
                test_type_id INT,
                test_name VARCHAR(100) NOT NULL,
                param_key VARCHAR(50) NOT NULL,
                param_label VARCHAR(100) NOT NULL,
                param_type VARCHAR(20) DEFAULT 'number',
                unit VARCHAR(30),
                reference_min DECIMAL,
                reference_max DECIMAL,
                reference_text VARCHAR(100),
                display_order INT DEFAULT 0,
                is_required BOOLEAN DEFAULT false,
                loinc_code VARCHAR(20),
                critical_low DECIMAL,
                critical_high DECIMAL,
                options JSONB,
                placeholder VARCHAR(100),
                step VARCHAR(10),
                category VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 2. Create instrument_test_mapping table
        console.log('🔌 Creating instrument_test_mapping table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS instrument_test_mapping (
                id SERIAL PRIMARY KEY,
                instrument_driver_id INT,
                manufacturer VARCHAR(100),
                model VARCHAR(100),
                instrument_code VARCHAR(50) NOT NULL,
                wolf_param_key VARCHAR(50) NOT NULL,
                wolf_test_name VARCHAR(100),
                unit_conversion JSONB DEFAULT '{"multiply": 1, "add": 0}',
                notes VARCHAR(255),
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // 3. Seed comprehensive test parameters
        console.log('\n🩸 Seeding Hematology Parameters...');
        await seedHematologyParams(client);

        console.log('🧪 Seeding Biochemistry Parameters...');
        await seedBiochemistryParams(client);

        console.log('🦋 Seeding Thyroid Parameters...');
        await seedThyroidParams(client);

        console.log('💧 Seeding Urine Parameters...');
        await seedUrineParams(client);

        console.log('🧫 Seeding Serology Parameters...');
        await seedSerologyParams(client);

        console.log('🔬 Seeding Instrument Mappings...');
        await seedInstrumentMappings(client);

        await client.query('COMMIT');

        // Summary
        const paramCount = await client.query('SELECT COUNT(*) FROM lab_test_parameters');
        const mappingCount = await client.query('SELECT COUNT(*) FROM instrument_test_mapping');
        
        console.log(`\n✅ Migration Complete!`);
        console.log(`📊 ${paramCount.rows[0].count} test parameters seeded`);
        console.log(`🔌 ${mappingCount.rows[0].count} instrument mappings seeded`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        client.release();
        pool.end();
    }
}

// Hematology Tests
async function seedHematologyParams(client) {
    const params = [
        // CBC - Complete Blood Count
        { test: 'CBC', key: 'wbc', label: 'WBC Count', unit: '×10³/µL', min: 4.5, max: 11.0, cat: 'hematology', order: 1 },
        { test: 'CBC', key: 'rbc', label: 'RBC Count', unit: '×10⁶/µL', min: 4.5, max: 5.5, cat: 'hematology', order: 2 },
        { test: 'CBC', key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', min: 12.0, max: 16.0, cat: 'hematology', order: 3 },
        { test: 'CBC', key: 'hematocrit', label: 'Hematocrit', unit: '%', min: 36, max: 48, cat: 'hematology', order: 4 },
        { test: 'CBC', key: 'platelets', label: 'Platelet Count', unit: '×10³/µL', min: 150, max: 400, cat: 'hematology', order: 5 },
        { test: 'CBC', key: 'mcv', label: 'MCV', unit: 'fL', min: 80, max: 100, cat: 'hematology', order: 6 },
        { test: 'CBC', key: 'mch', label: 'MCH', unit: 'pg', min: 27, max: 33, cat: 'hematology', order: 7 },
        { test: 'CBC', key: 'mchc', label: 'MCHC', unit: 'g/dL', min: 32, max: 36, cat: 'hematology', order: 8 },
        
        // Platelet Count (standalone)
        { test: 'Platelet Count', key: 'platelets', label: 'Platelet Count', unit: '×10³/µL', min: 150, max: 400, cat: 'hematology', order: 1 },
        
        // Hemoglobin (standalone)
        { test: 'Hemoglobin', key: 'hemoglobin', label: 'Hemoglobin', unit: 'g/dL', min: 12.0, max: 16.0, cat: 'hematology', order: 1 },
        
        // Differential Count
        { test: 'Differential Count', key: 'neutrophils', label: 'Neutrophils', unit: '%', min: 40, max: 70, cat: 'hematology', order: 1 },
        { test: 'Differential Count', key: 'lymphocytes', label: 'Lymphocytes', unit: '%', min: 20, max: 40, cat: 'hematology', order: 2 },
        { test: 'Differential Count', key: 'monocytes', label: 'Monocytes', unit: '%', min: 2, max: 8, cat: 'hematology', order: 3 },
        { test: 'Differential Count', key: 'eosinophils', label: 'Eosinophils', unit: '%', min: 1, max: 4, cat: 'hematology', order: 4 },
        { test: 'Differential Count', key: 'basophils', label: 'Basophils', unit: '%', min: 0, max: 1, cat: 'hematology', order: 5 },
        
        // ESR
        { test: 'ESR', key: 'esr', label: 'ESR', unit: 'mm/hr', min: 0, max: 20, cat: 'hematology', order: 1 },
        
        // Coagulation
        { test: 'PT/INR', key: 'pt', label: 'Prothrombin Time', unit: 'seconds', min: 11, max: 13.5, cat: 'coagulation', order: 1 },
        { test: 'PT/INR', key: 'inr', label: 'INR', unit: '', min: 0.8, max: 1.2, cat: 'coagulation', order: 2 },
        { test: 'aPTT', key: 'aptt', label: 'aPTT', unit: 'seconds', min: 25, max: 35, cat: 'coagulation', order: 1 }
    ];

    for (const p of params) {
        await client.query(`
            INSERT INTO lab_test_parameters (test_name, param_key, param_label, unit, reference_min, reference_max, category, display_order)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT DO NOTHING
        `, [p.test, p.key, p.label, p.unit, p.min, p.max, p.cat, p.order]);
    }
}

// Biochemistry Tests
async function seedBiochemistryParams(client) {
    const params = [
        // Liver Function Test
        { test: 'Liver Function Test', key: 'alt', label: 'ALT (SGPT)', unit: 'U/L', min: 7, max: 56 },
        { test: 'Liver Function Test', key: 'ast', label: 'AST (SGOT)', unit: 'U/L', min: 10, max: 40 },
        { test: 'Liver Function Test', key: 'alp', label: 'Alkaline Phosphatase', unit: 'U/L', min: 44, max: 147 },
        { test: 'Liver Function Test', key: 'bilirubin_total', label: 'Total Bilirubin', unit: 'mg/dL', min: 0.1, max: 1.2 },
        { test: 'Liver Function Test', key: 'bilirubin_direct', label: 'Direct Bilirubin', unit: 'mg/dL', min: 0, max: 0.3 },
        { test: 'Liver Function Test', key: 'albumin', label: 'Albumin', unit: 'g/dL', min: 3.5, max: 5.0 },
        { test: 'Liver Function Test', key: 'total_protein', label: 'Total Protein', unit: 'g/dL', min: 6.0, max: 8.3 },
        { test: 'Liver Function Test', key: 'ggt', label: 'GGT', unit: 'U/L', min: 9, max: 48 },

        // Kidney Function Test
        { test: 'Kidney Function Test', key: 'creatinine', label: 'Creatinine', unit: 'mg/dL', min: 0.7, max: 1.3 },
        { test: 'Kidney Function Test', key: 'urea', label: 'Blood Urea', unit: 'mg/dL', min: 15, max: 45 },
        { test: 'Kidney Function Test', key: 'bun', label: 'BUN', unit: 'mg/dL', min: 7, max: 20 },
        { test: 'Kidney Function Test', key: 'uric_acid', label: 'Uric Acid', unit: 'mg/dL', min: 3.5, max: 7.2 },
        { test: 'Kidney Function Test', key: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', min: 90, max: 120 },

        // Lipid Profile
        { test: 'Lipid Profile', key: 'cholesterol_total', label: 'Total Cholesterol', unit: 'mg/dL', min: 0, max: 200 },
        { test: 'Lipid Profile', key: 'hdl', label: 'HDL Cholesterol', unit: 'mg/dL', min: 40, max: 60 },
        { test: 'Lipid Profile', key: 'ldl', label: 'LDL Cholesterol', unit: 'mg/dL', min: 0, max: 100 },
        { test: 'Lipid Profile', key: 'vldl', label: 'VLDL', unit: 'mg/dL', min: 5, max: 40 },
        { test: 'Lipid Profile', key: 'triglycerides', label: 'Triglycerides', unit: 'mg/dL', min: 0, max: 150 },

        // Blood Sugar Tests
        { test: 'Blood Sugar Fasting', key: 'glucose_fasting', label: 'Fasting Blood Sugar', unit: 'mg/dL', min: 70, max: 100 },
        { test: 'Blood Sugar PP', key: 'glucose_pp', label: 'Post Prandial Sugar', unit: 'mg/dL', min: 0, max: 140 },
        { test: 'Blood Sugar Random', key: 'glucose_random', label: 'Random Blood Sugar', unit: 'mg/dL', min: 0, max: 200 },
        { test: 'HbA1c', key: 'hba1c', label: 'HbA1c', unit: '%', min: 0, max: 5.7 },

        // Electrolytes
        { test: 'Electrolytes', key: 'sodium', label: 'Sodium', unit: 'mEq/L', min: 136, max: 145 },
        { test: 'Electrolytes', key: 'potassium', label: 'Potassium', unit: 'mEq/L', min: 3.5, max: 5.0 },
        { test: 'Electrolytes', key: 'chloride', label: 'Chloride', unit: 'mEq/L', min: 98, max: 106 },
        { test: 'Electrolytes', key: 'calcium', label: 'Calcium', unit: 'mg/dL', min: 8.5, max: 10.5 },
        { test: 'Electrolytes', key: 'phosphorus', label: 'Phosphorus', unit: 'mg/dL', min: 2.5, max: 4.5 },

        // Vitamins & Minerals
        { test: 'Vitamin D', key: 'vitamin_d', label: 'Vitamin D (25-OH)', unit: 'ng/mL', min: 30, max: 100 },
        { test: 'Vitamin B12', key: 'vitamin_b12', label: 'Vitamin B12', unit: 'pg/mL', min: 200, max: 900 },
        { test: 'Iron Profile', key: 'serum_iron', label: 'Serum Iron', unit: 'µg/dL', min: 60, max: 170 },
        { test: 'Iron Profile', key: 'tibc', label: 'TIBC', unit: 'µg/dL', min: 250, max: 370 },
        { test: 'Iron Profile', key: 'ferritin', label: 'Ferritin', unit: 'ng/mL', min: 12, max: 150 }
    ];

    for (const p of params) {
        await client.query(`
            INSERT INTO lab_test_parameters (test_name, param_key, param_label, unit, reference_min, reference_max, category, display_order)
            VALUES ($1, $2, $3, $4, $5, $6, 'biochemistry', 0)
            ON CONFLICT DO NOTHING
        `, [p.test, p.key, p.label, p.unit, p.min, p.max]);
    }
}

// Thyroid Tests
async function seedThyroidParams(client) {
    const params = [
        { test: 'Thyroid Profile', key: 'tsh', label: 'TSH', unit: 'mIU/L', min: 0.4, max: 4.0 },
        { test: 'Thyroid Profile', key: 't3', label: 'Total T3', unit: 'ng/dL', min: 80, max: 200 },
        { test: 'Thyroid Profile', key: 't4', label: 'Total T4', unit: 'µg/dL', min: 5.0, max: 12.0 },
        { test: 'Thyroid Profile', key: 'free_t3', label: 'Free T3', unit: 'pg/mL', min: 2.0, max: 4.4 },
        { test: 'Thyroid Profile', key: 'free_t4', label: 'Free T4', unit: 'ng/dL', min: 0.8, max: 1.8 },
        { test: 'TSH', key: 'tsh', label: 'TSH', unit: 'mIU/L', min: 0.4, max: 4.0 }
    ];

    for (const p of params) {
        await client.query(`
            INSERT INTO lab_test_parameters (test_name, param_key, param_label, unit, reference_min, reference_max, category)
            VALUES ($1, $2, $3, $4, $5, $6, 'thyroid')
            ON CONFLICT DO NOTHING
        `, [p.test, p.key, p.label, p.unit, p.min, p.max]);
    }
}

// Urine Tests
async function seedUrineParams(client) {
    const params = [
        { test: 'Urine Routine', key: 'color', label: 'Color', type: 'text' },
        { test: 'Urine Routine', key: 'appearance', label: 'Appearance', type: 'text' },
        { test: 'Urine Routine', key: 'ph', label: 'pH', unit: '', min: 4.5, max: 8.0 },
        { test: 'Urine Routine', key: 'specific_gravity', label: 'Specific Gravity', unit: '', min: 1.005, max: 1.030 },
        { test: 'Urine Routine', key: 'protein', label: 'Protein', type: 'text' },
        { test: 'Urine Routine', key: 'glucose', label: 'Glucose', type: 'text' },
        { test: 'Urine Routine', key: 'ketones', label: 'Ketones', type: 'text' },
        { test: 'Urine Routine', key: 'blood', label: 'Blood', type: 'text' },
        { test: 'Urine Routine', key: 'leukocytes', label: 'Leukocytes', type: 'text' }
    ];

    for (const p of params) {
        await client.query(`
            INSERT INTO lab_test_parameters (test_name, param_key, param_label, param_type, unit, reference_min, reference_max, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'urine')
            ON CONFLICT DO NOTHING
        `, [p.test, p.key, p.label, p.type || 'number', p.unit || '', p.min || null, p.max || null]);
    }
}

// Serology Tests
async function seedSerologyParams(client) {
    const params = [
        { test: 'HIV Test', key: 'hiv', label: 'HIV 1 & 2', type: 'text' },
        { test: 'HBsAg', key: 'hbsag', label: 'Hepatitis B Surface Antigen', type: 'text' },
        { test: 'HCV', key: 'hcv', label: 'Hepatitis C Antibody', type: 'text' },
        { test: 'VDRL', key: 'vdrl', label: 'VDRL', type: 'text' },
        { test: 'Widal Test', key: 'widal_o', label: 'Widal O', type: 'text' },
        { test: 'Widal Test', key: 'widal_h', label: 'Widal H', type: 'text' },
        { test: 'Dengue NS1', key: 'dengue_ns1', label: 'Dengue NS1 Antigen', type: 'text' },
        { test: 'Dengue Serology', key: 'dengue_igg', label: 'Dengue IgG', type: 'text' },
        { test: 'Dengue Serology', key: 'dengue_igm', label: 'Dengue IgM', type: 'text' },
        { test: 'Malaria', key: 'malaria_pf', label: 'P. Falciparum', type: 'text' },
        { test: 'Malaria', key: 'malaria_pv', label: 'P. Vivax', type: 'text' },
        { test: 'CRP', key: 'crp', label: 'C-Reactive Protein', unit: 'mg/L', min: 0, max: 10 },
        { test: 'RA Factor', key: 'ra_factor', label: 'Rheumatoid Factor', unit: 'IU/mL', min: 0, max: 14 },
        { test: 'ASO', key: 'aso', label: 'ASO Titre', unit: 'IU/mL', min: 0, max: 200 }
    ];

    for (const p of params) {
        await client.query(`
            INSERT INTO lab_test_parameters (test_name, param_key, param_label, param_type, unit, reference_min, reference_max, category)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'serology')
            ON CONFLICT DO NOTHING
        `, [p.test, p.key, p.label, p.type || 'number', p.unit || '', p.min || null, p.max || null]);
    }
}

// Instrument Mappings
async function seedInstrumentMappings(client) {
    const mappings = [
        // Sysmex XN-550 (Hematology)
        { mfr: 'Sysmex', model: 'XN-550', code: 'WBC', key: 'wbc', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'RBC', key: 'rbc', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'HGB', key: 'hemoglobin', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'HCT', key: 'hematocrit', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'PLT', key: 'platelets', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'MCV', key: 'mcv', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'MCH', key: 'mch', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'MCHC', key: 'mchc', test: 'CBC' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'NEUT%', key: 'neutrophils', test: 'Differential' },
        { mfr: 'Sysmex', model: 'XN-550', code: 'LYMPH%', key: 'lymphocytes', test: 'Differential' },

        // Mindray BC-6200 (Hematology)
        { mfr: 'Mindray', model: 'BC-6200', code: 'WBC', key: 'wbc', test: 'CBC' },
        { mfr: 'Mindray', model: 'BC-6200', code: 'RBC', key: 'rbc', test: 'CBC' },
        { mfr: 'Mindray', model: 'BC-6200', code: 'HGB', key: 'hemoglobin', test: 'CBC' },
        { mfr: 'Mindray', model: 'BC-6200', code: 'PLT', key: 'platelets', test: 'CBC' },

        // Mindray BS-480 (Biochemistry)
        { mfr: 'Mindray', model: 'BS-480', code: 'GLU', key: 'glucose_fasting', test: 'Blood Sugar' },
        { mfr: 'Mindray', model: 'BS-480', code: 'CREA', key: 'creatinine', test: 'KFT' },
        { mfr: 'Mindray', model: 'BS-480', code: 'UREA', key: 'urea', test: 'KFT' },
        { mfr: 'Mindray', model: 'BS-480', code: 'ALT', key: 'alt', test: 'LFT' },
        { mfr: 'Mindray', model: 'BS-480', code: 'AST', key: 'ast', test: 'LFT' },
        { mfr: 'Mindray', model: 'BS-480', code: 'CHOL', key: 'cholesterol_total', test: 'Lipid' },

        // Erba EM 200 (Biochemistry)
        { mfr: 'Transasia/Erba', model: 'EM 200', code: 'GLU', key: 'glucose_fasting', test: 'Blood Sugar' },
        { mfr: 'Transasia/Erba', model: 'EM 200', code: 'SGPT', key: 'alt', test: 'LFT' },
        { mfr: 'Transasia/Erba', model: 'EM 200', code: 'SGOT', key: 'ast', test: 'LFT' },
        { mfr: 'Transasia/Erba', model: 'EM 200', code: 'TBIL', key: 'bilirubin_total', test: 'LFT' }
    ];

    for (const m of mappings) {
        await client.query(`
            INSERT INTO instrument_test_mapping (manufacturer, model, instrument_code, wolf_param_key, wolf_test_name)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT DO NOTHING
        `, [m.mfr, m.model, m.code, m.key, m.test]);
    }
}

// Run
runMigration().catch(console.error);
