/**
 * Lab System Unification Migration
 * Links lab_test_parameters to lab_test_types and seeds comprehensive data
 * Run: node run_lab_unify.js
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

async function runUnification() {
    const client = await pool.connect();
    
    try {
        console.log('🔬 Lab System Unification Starting...\n');
        await client.query('BEGIN');

        // Step 1: Add test_type_id FK to lab_test_parameters
        console.log('📋 Phase 1: Adding test_type_id FK...');
        await client.query(`
            ALTER TABLE lab_test_parameters 
            ADD COLUMN IF NOT EXISTS test_type_id INT REFERENCES lab_test_types(id)
        `);
        console.log('  ✅ Added test_type_id column');

        // Step 2: Create mapping index
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_lab_params_test_type 
            ON lab_test_parameters(test_type_id)
        `);
        console.log('  ✅ Created index');

        // Step 3: Map existing parameters to tests
        console.log('\n🔗 Phase 2: Mapping existing parameters to tests...');
        const mappings = [
            // Hematology
            { param_test: 'CBC', db_test: '%Blood Count%' },
            { param_test: 'Platelet Count', db_test: 'Platelet Count' },
            { param_test: 'Hemoglobin', db_test: 'Hemoglobin%' },
            { param_test: 'Differential Count', db_test: '%Neutrophils%' },
            { param_test: 'ESR', db_test: 'ESR%' },
            { param_test: 'PT/INR', db_test: '%Prothrombin%' },
            
            // Liver
            { param_test: 'Liver Function Test', db_test: 'SGOT%' },
            
            // Kidney
            { param_test: 'Kidney Function Test', db_test: '%Creatinine%' },
            
            // Lipid
            { param_test: 'Lipid Profile', db_test: '%Cholesterol%' },
            
            // Blood Sugar
            { param_test: 'Blood Sugar Fasting', db_test: 'Fasting Blood Sugar%' },
            { param_test: 'Blood Sugar PP', db_test: '%Post Prandial%' },
            { param_test: 'Blood Sugar Random', db_test: 'Random Blood Sugar%' },
            { param_test: 'HbA1c', db_test: 'HbA1c%' },
            
            // Thyroid
            { param_test: 'Thyroid Profile', db_test: 'TSH%' },
            { param_test: 'TSH', db_test: 'TSH%' },
            
            // Electrolytes
            { param_test: 'Electrolytes', db_test: 'Sodium%' },
            
            // Vitamins
            { param_test: 'Vitamin D', db_test: '%Vitamin D%' },
            { param_test: 'Vitamin B12', db_test: '%B12%' },
            
            // Urine
            { param_test: 'Urine Routine', db_test: '%Urine%' },
            
            // Serology
            { param_test: 'HIV Test', db_test: '%HIV%' },
            { param_test: 'HBsAg', db_test: '%Hepatitis B%' },
            { param_test: 'HCV', db_test: '%Hepatitis C%' },
            { param_test: 'Dengue%', db_test: '%Dengue%' },
            { param_test: 'Malaria', db_test: '%Malaria%' },
            { param_test: 'CRP', db_test: '%CRP%' }
        ];

        let mapped = 0;
        for (const m of mappings) {
            const testRes = await client.query(
                'SELECT id FROM lab_test_types WHERE name ILIKE $1 LIMIT 1',
                [m.db_test]
            );
            
            if (testRes.rows.length > 0) {
                const result = await client.query(`
                    UPDATE lab_test_parameters 
                    SET test_type_id = $1 
                    WHERE test_name ILIKE $2 AND test_type_id IS NULL
                `, [testRes.rows[0].id, `%${m.param_test}%`]);
                
                if (result.rowCount > 0) {
                    console.log(`  ✅ Mapped ${m.param_test} → test_id ${testRes.rows[0].id}`);
                    mapped += result.rowCount;
                }
            }
        }
        console.log(`  📊 Total parameters mapped: ${mapped}`);

        // Step 4: Seed parameters for all tests in lab_test_types
        console.log('\n📊 Phase 3: Seeding parameters for all tests...');
        
        // Get all tests that don't have parameters linked
        const testsWithoutParams = await client.query(`
            SELECT lt.id, lt.name, ltc.name as category
            FROM lab_test_types lt
            LEFT JOIN lab_test_categories ltc ON lt.category_id = ltc.id
            WHERE lt.id NOT IN (SELECT DISTINCT test_type_id FROM lab_test_parameters WHERE test_type_id IS NOT NULL)
        `);

        console.log(`  Found ${testsWithoutParams.rows.length} tests without linked parameters`);

        // Reference ranges by test (Indian population values)
        const refRanges = {
            'Hemoglobin': { min: 12.0, max: 16.0, unit: 'g/dL' },
            'RBC Count': { min: 4.5, max: 5.5, unit: 'million/µL' },
            'WBC Count': { min: 4500, max: 11000, unit: '/µL' },
            'Platelet Count': { min: 150000, max: 400000, unit: '/µL' },
            'Hematocrit': { min: 36, max: 48, unit: '%' },
            'MCV': { min: 80, max: 100, unit: 'fL' },
            'MCH': { min: 27, max: 33, unit: 'pg' },
            'MCHC': { min: 32, max: 36, unit: 'g/dL' },
            'Neutrophils': { min: 40, max: 70, unit: '%' },
            'Lymphocytes': { min: 20, max: 40, unit: '%' },
            'Eosinophils': { min: 1, max: 4, unit: '%' },
            'ESR': { min: 0, max: 20, unit: 'mm/hr' },
            'Bilirubin Total': { min: 0.1, max: 1.2, unit: 'mg/dL' },
            'Bilirubin Direct': { min: 0, max: 0.3, unit: 'mg/dL' },
            'SGOT': { min: 10, max: 40, unit: 'U/L' },
            'SGPT': { min: 7, max: 56, unit: 'U/L' },
            'Alkaline Phosphatase': { min: 44, max: 147, unit: 'U/L' },
            'Gamma GT': { min: 9, max: 48, unit: 'U/L' },
            'Total Protein': { min: 6.0, max: 8.3, unit: 'g/dL' },
            'Albumin': { min: 3.5, max: 5.0, unit: 'g/dL' },
            'T3': { min: 80, max: 200, unit: 'ng/dL' },
            'T4': { min: 5.0, max: 12.0, unit: 'µg/dL' },
            'TSH': { min: 0.4, max: 4.0, unit: 'mIU/L' },
            'Free T3': { min: 2.0, max: 4.4, unit: 'pg/mL' },
            'Free T4': { min: 0.8, max: 1.8, unit: 'ng/dL' },
            'Blood Urea': { min: 15, max: 45, unit: 'mg/dL' },
            'Serum Creatinine': { min: 0.7, max: 1.3, unit: 'mg/dL' },
            'Uric Acid': { min: 3.5, max: 7.2, unit: 'mg/dL' },
            'BUN': { min: 7, max: 20, unit: 'mg/dL' },
            'eGFR': { min: 90, max: 120, unit: 'mL/min/1.73m²' },
            'Total Cholesterol': { min: null, max: 200, unit: 'mg/dL' },
            'HDL Cholesterol': { min: 40, max: null, unit: 'mg/dL' },
            'LDL Cholesterol': { min: null, max: 100, unit: 'mg/dL' },
            'VLDL Cholesterol': { min: 5, max: 40, unit: 'mg/dL' },
            'Triglycerides': { min: null, max: 150, unit: 'mg/dL' },
            'Fasting Blood Sugar': { min: 70, max: 100, unit: 'mg/dL' },
            'Random Blood Sugar': { min: null, max: 200, unit: 'mg/dL' },
            'HbA1c': { min: null, max: 5.7, unit: '%' },
            'Sodium': { min: 136, max: 145, unit: 'mEq/L' },
            'Potassium': { min: 3.5, max: 5.0, unit: 'mEq/L' },
            'Chloride': { min: 98, max: 106, unit: 'mEq/L' },
            'Calcium': { min: 8.5, max: 10.5, unit: 'mg/dL' },
            'Troponin': { min: null, max: 0.04, unit: 'ng/mL' },
            'CK-MB': { min: null, max: 25, unit: 'U/L' },
            'CPK': { min: 10, max: 120, unit: 'U/L' }
        };

        let seeded = 0;
        for (const test of testsWithoutParams.rows) {
            // Find matching reference range
            let ref = null;
            for (const [key, value] of Object.entries(refRanges)) {
                if (test.name.toLowerCase().includes(key.toLowerCase())) {
                    ref = value;
                    break;
                }
            }

            // Create a parameter for this test
            const paramKey = test.name.toLowerCase()
                .replace(/[^a-z0-9]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');

            await client.query(`
                INSERT INTO lab_test_parameters 
                (test_name, test_type_id, param_key, param_label, param_type, unit, reference_min, reference_max, category)
                VALUES ($1, $2, $3, $4, 'number', $5, $6, $7, $8)
                ON CONFLICT DO NOTHING
            `, [
                test.name,
                test.id,
                paramKey,
                test.name,
                ref?.unit || '',
                ref?.min || null,
                ref?.max || null,
                test.category || 'General'
            ]);
            seeded++;
        }
        console.log(`  📊 Seeded ${seeded} new parameters`);

        await client.query('COMMIT');

        // Summary
        const paramCount = await client.query('SELECT COUNT(*) FROM lab_test_parameters');
        const linkedCount = await client.query('SELECT COUNT(*) FROM lab_test_parameters WHERE test_type_id IS NOT NULL');
        
        console.log(`\n✅ Unification Complete!`);
        console.log(`📊 Total parameters: ${paramCount.rows[0].count}`);
        console.log(`🔗 Linked to tests: ${linkedCount.rows[0].count}`);

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Unification failed:', error);
        throw error;
    } finally {
        client.release();
        pool.end();
    }
}

runUnification().catch(console.error);
