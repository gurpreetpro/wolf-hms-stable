const pool = require('./config/db');

/**
 * DEMO DATA FIX SCRIPT
 * Fixes missing data that breaks demo flow
 */

async function fixDemoData() {
    console.log('\n=== DEMO DATA FIX ===\n');

    // 1. Create lab_test_categories table if missing
    console.log('1. Checking lab_test_categories table...');
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS lab_test_categories (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL UNIQUE,
                description TEXT,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('   ✅ Table exists/created');
    } catch (e) {
        console.log('   ❌ Error:', e.message);
    }

    // 2. Seed lab categories
    console.log('2. Seeding lab test categories...');
    const categories = [
        'Hematology', 'Biochemistry', 'Microbiology', 'Serology',
        'Endocrinology', 'Cardiology', 'Urine Analysis', 'Imaging'
    ];
    for (const cat of categories) {
        try {
            await pool.query(
                'INSERT INTO lab_test_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
                [cat]
            );
        } catch (e) { }
    }
    const catCount = await pool.query('SELECT COUNT(*) FROM lab_test_categories');
    console.log(`   ✅ Categories: ${catCount.rows[0].count}`);

    // 3. Add category_id column to lab_test_types if missing
    console.log('3. Adding category_id to lab_test_types...');
    try {
        await pool.query(`
            ALTER TABLE lab_test_types 
            ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES lab_test_categories(id)
        `);
        console.log('   ✅ Column added/exists');
    } catch (e) {
        console.log('   ❌ Error:', e.message);
    }

    // 4. Assign categories to tests
    console.log('4. Assigning categories to lab tests...');
    const categoryMappings = {
        'Hematology': ['Hemoglobin', 'RBC', 'WBC', 'Platelet', 'CBC', 'Hematocrit', 'ESR', 'Blood Culture'],
        'Biochemistry': ['Bilirubin', 'SGOT', 'SGPT', 'ALP', 'GGT', 'Protein', 'Albumin', 'Urea', 'Creatinine', 'Uric', 'BUN', 'eGFR', 'Cholesterol', 'HDL', 'LDL', 'VLDL', 'Triglycerides', 'Sugar', 'Glucose', 'FBS', 'RBS', 'PPBS', 'HbA1c', 'Insulin', 'Sodium', 'Potassium', 'Chloride', 'Calcium', 'Magnesium', 'Phosphorus', 'CEA', 'CA 125', 'CA 19-9', 'AFP', 'PSA'],
        'Endocrinology': ['T3', 'T4', 'TSH', 'Thyroid', 'Testosterone', 'Estradiol', 'Progesterone', 'Prolactin', 'FSH', 'LH', 'Cortisol', 'Vitamin D'],
        'Cardiology': ['Troponin', 'CK-MB', 'CPK', 'LDH', 'BNP', 'ECG', 'Echo'],
        'Serology': ['HIV', 'HBsAg', 'HCV', 'VDRL', 'Widal', 'Dengue', 'Malaria', 'COVID'],
        'Urine Analysis': ['Urine'],
        'Imaging': ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound'],
        'Microbiology': ['Culture', 'Sputum', 'Stool', 'Throat Swab']
    };

    for (const [catName, keywords] of Object.entries(categoryMappings)) {
        const catRes = await pool.query('SELECT id FROM lab_test_categories WHERE name = $1', [catName]);
        if (catRes.rows.length > 0) {
            const catId = catRes.rows[0].id;
            for (const kw of keywords) {
                await pool.query(
                    `UPDATE lab_test_types SET category_id = $1 WHERE name ILIKE $2 AND category_id IS NULL`,
                    [catId, `%${kw}%`]
                );
            }
        }
    }

    // Set default category for uncategorized
    const defaultCat = await pool.query("SELECT id FROM lab_test_categories WHERE name = 'Biochemistry'");
    if (defaultCat.rows.length > 0) {
        await pool.query('UPDATE lab_test_types SET category_id = $1 WHERE category_id IS NULL', [defaultCat.rows[0].id]);
    }
    console.log('   ✅ Categories assigned');

    // 5. Verify lab tests
    console.log('5. Lab tests count...');
    const labCount = await pool.query('SELECT COUNT(*) FROM lab_test_types');
    console.log(`   ✅ Lab tests: ${labCount.rows[0].count}`);

    // 6. Check wards
    console.log('6. Checking wards...');
    const wardCount = await pool.query('SELECT COUNT(*) FROM wards');
    console.log(`   ✅ Wards: ${wardCount.rows[0].count}`);

    // 7. Check beds
    console.log('7. Checking beds...');
    const bedCount = await pool.query('SELECT COUNT(*) FROM beds');
    const availBeds = await pool.query("SELECT COUNT(*) FROM beds WHERE status = 'Available'");
    console.log(`   ✅ Beds: ${bedCount.rows[0].count} (${availBeds.rows[0].count} available)`);

    // 8. Check users/roles
    console.log('8. Users by role...');
    const roles = await pool.query('SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role');
    for (const r of roles.rows) {
        console.log(`   - ${r.role}: ${r.count}`);
    }

    console.log('\n=== FIX COMPLETE ===\n');
    process.exit(0);
}

fixDemoData().catch(e => {
    console.error('Fatal error:', e);
    process.exit(1);
});
