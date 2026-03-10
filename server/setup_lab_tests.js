const { Pool } = require('pg');

// Database connection config
const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'postgres', // Connect to default postgres DB first
    password: 'Hospital456!', // Updated with correct password
    port: 5432
});

async function setupLabTests() {
    console.log('🔬 HMS Lab Tests Setup - Automated Installer\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    try {
        // Step 1: Check if hms_db exists, create if not
        console.log('📋 Step 1: Checking if hms_db exists...');
        const dbCheck = await pool.query(`
            SELECT 1 FROM pg_database WHERE datname = 'hms_db'
        `);

        if (dbCheck.rows.length === 0) {
            console.log('   Creating hms_db database...');
            await pool.query('CREATE DATABASE hms_db');
            console.log('   ✅ Database created!\n');
        } else {
            console.log('   ✅ Database already exists\n');
        }

        // Step 2: Connect to hms_db
        console.log('📋 Step 2: Connecting to hms_db...');
        const hmsPool = new Pool({
            user: 'postgres',
            host: 'localhost',
            database: 'hms_db',
            password: 'Hospital456!', // Updated with correct password
            port: 5432
        });

        // Step 3: Create tables
        console.log('   Creating lab_test_types table...');
        await hmsPool.query(`
            CREATE TABLE IF NOT EXISTS lab_test_types (
                id SERIAL PRIMARY KEY,
                name VARCHAR(200) NOT NULL UNIQUE,
                category_id INT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        console.log('   Creating lab_test_categories table...');
        await hmsPool.query(`
            CREATE TABLE IF NOT EXISTS lab_test_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);

        // Add foreign key
        await hmsPool.query(`
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM information_schema.table_constraints 
                    WHERE constraint_name = 'lab_test_types_category_id_fkey'
                ) THEN
                    ALTER TABLE lab_test_types 
                    ADD CONSTRAINT lab_test_types_category_id_fkey 
                    FOREIGN KEY (category_id) REFERENCES lab_test_categories(id);
                END IF;
            END$$;
        `);
        console.log('   ✅ Tables created!\n');

        // Step 4: Insert categories
        console.log('📋 Step 3: Inserting lab test categories...');
        await hmsPool.query(`
            INSERT INTO lab_test_categories (name, description) VALUES
            ('Complete Blood Count', 'Comprehensive blood cell analysis'),
            ('Liver Function Tests', 'Tests to assess liver health and function'),
            ('Thyroid Profile', 'Tests to evaluate thyroid gland function'),
            ('Kidney Function Tests', 'Tests to assess kidney health and filtration'),
            ('Lipid Profile', 'Cholesterol and triglyceride measurements'),
            ('Diabetes Panel', 'Blood sugar and related markers'),
            ('Electrolytes', 'Blood mineral and electrolyte levels'),
            ('Cardiac Markers', 'Heart health indicators'),
            ('Infectious Disease', 'Viral and bacterial screening'),
            ('Urine Analysis', 'Kidney and metabolic screening')
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('   ✅ 10 categories inserted!\n');

        // Step 5: Insert lab tests
        console.log('📋 Step 4: Inserting 50 lab tests...');

        const tests = [
            // CBC (12)
            "('Hemoglobin (Hb)', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('RBC Count', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('WBC Count', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('Platelet Count', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('Hematocrit (PCV)', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('MCV', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('MCH', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('MCHC', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('Neutrophils', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('Lymphocytes', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('Eosinophils', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",
            "('ESR', (SELECT id FROM lab_test_categories WHERE name='Complete Blood Count'))",

            // Liver (10)
            "('Bilirubin Total', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('Bilirubin Direct', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('SGOT (AST)', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('SGPT (ALT)', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('Alkaline Phosphatase', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('Gamma GT', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('Total Protein', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('Albumin', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('Globulin', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",
            "('A/G Ratio', (SELECT id FROM lab_test_categories WHERE name='Liver Function Tests'))",

            // Thyroid (5)
            "('T3', (SELECT id FROM lab_test_categories WHERE name='Thyroid Profile'))",
            "('T4', (SELECT id FROM lab_test_categories WHERE name='Thyroid Profile'))",
            "('TSH', (SELECT id FROM lab_test_categories WHERE name='Thyroid Profile'))",
            "('Free T3', (SELECT id FROM lab_test_categories WHERE name='Thyroid Profile'))",
            "('Free T4', (SELECT id FROM lab_test_categories WHERE name='Thyroid Profile'))",

            // Kidney (5)
            "('Blood Urea', (SELECT id FROM lab_test_categories WHERE name='Kidney Function Tests'))",
            "('Serum Creatinine', (SELECT id FROM lab_test_categories WHERE name='Kidney Function Tests'))",
            "('Uric Acid', (SELECT id FROM lab_test_categories WHERE name='Kidney Function Tests'))",
            "('BUN', (SELECT id FROM lab_test_categories WHERE name='Kidney Function Tests'))",
            "('eGFR', (SELECT id FROM lab_test_categories WHERE name='Kidney Function Tests'))",

            // Lipid (6)
            "('Total Cholesterol', (SELECT id FROM lab_test_categories WHERE name='Lipid Profile'))",
            "('HDL Cholesterol', (SELECT id FROM lab_test_categories WHERE name='Lipid Profile'))",
            "('LDL Cholesterol', (SELECT id FROM lab_test_categories WHERE name='Lipid Profile'))",
            "('VLDL Cholesterol', (SELECT id FROM lab_test_categories WHERE name='Lipid Profile'))",
            "('Triglycerides', (SELECT id FROM lab_test_categories WHERE name='Lipid Profile'))",
            "('Cholesterol/HDL Ratio', (SELECT id FROM lab_test_categories WHERE name='Lipid Profile'))",

            // Diabetes (5)
            "('Fasting Blood Sugar', (SELECT id FROM lab_test_categories WHERE name='Diabetes Panel'))",
            "('Random Blood Sugar', (SELECT id FROM lab_test_categories WHERE name='Diabetes Panel'))",
            "('HbA1c', (SELECT id FROM lab_test_categories WHERE name='Diabetes Panel'))",
            "('PPBS', (SELECT id FROM lab_test_categories WHERE name='Diabetes Panel'))",
            "('Insulin (Fasting)', (SELECT id FROM lab_test_categories WHERE name='Diabetes Panel'))",

            // Electrolytes (4)
            "('Sodium (Na+)', (SELECT id FROM lab_test_categories WHERE name='Electrolytes'))",
            "('Potassium (K+)', (SELECT id FROM lab_test_categories WHERE name='Electrolytes'))",
            "('Chloride (Cl-)', (SELECT id FROM lab_test_categories WHERE name='Electrolytes'))",
            "('Calcium', (SELECT id FROM lab_test_categories WHERE name='Electrolytes'))",

            // Cardiac (3)
            "('Troponin I', (SELECT id FROM lab_test_categories WHERE name='Cardiac Markers'))",
            "('CK-MB', (SELECT id FROM lab_test_categories WHERE name='Cardiac Markers'))",
            "('CPK', (SELECT id FROM lab_test_categories WHERE name='Cardiac Markers'))"
        ];

        await hmsPool.query(`
            INSERT INTO lab_test_types (name, category_id) VALUES
            ${tests.join(',\n            ')}
            ON CONFLICT (name) DO NOTHING
        `);
        console.log('   ✅ Lab tests inserted!\n');

        // Step 6: Verify
        console.log('📋 Step 5: Verifying installation...\n');
        const result = await hmsPool.query('SELECT COUNT(*) FROM lab_test_types');
        console.log(`   ✅ Total lab tests in database: ${result.rows[0].count}\n`);

        const categories = await hmsPool.query(`
            SELECT c.name, COUNT(t.id) as count 
            FROM lab_test_categories c 
            LEFT JOIN lab_test_types t ON c.id = t.category_id 
            GROUP BY c.name 
            ORDER BY c.name
        `);

        console.log('📊 Lab Tests by Category:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        categories.rows.forEach(cat => {
            console.log(`   ${cat.name.padEnd(30)} ${cat.count} tests`);
        });

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
        console.log('✅ SUCCESS! Lab tests setup complete!\n');
        console.log('🎉 You can now:');
        console.log('   1. Refresh your browser (F5)');
        console.log('   2. Go to Doctor Dashboard');
        console.log('   3. Click "Select Lab Tests"');
        console.log('   4. Search for tests like "hemoglobin" or "cholesterol"\n');

        await hmsPool.end();
        await pool.end();
        process.exit(0);

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        console.error('\n💡 Troubleshooting:');
        console.error('   1. Make sure PostgreSQL is running');
        console.error('   2. Check your password in this file (line 8)');
        console.error('   3. Verify PostgreSQL is on port 5432\n');
        process.exit(1);
    }
}

setupLabTests();
