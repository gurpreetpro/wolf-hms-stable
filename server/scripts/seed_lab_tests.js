/**
 * Seed Lab Test Types - Populates the lab_test_types table with common tests
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hospital_db',
    password: process.env.DB_PASSWORD || 'password',
    port: process.env.DB_PORT || 5432,
});

async function seedLabTests() {
    try {
        console.log('🧪 Seeding Lab Test Types...\n');

        // 1. Ensure categories exist
        const categories = ['Haematology', 'Biochemistry', 'Microbiology', 'Serology', 'Endocrinology', 'Radiology'];
        for (const cat of categories) {
            await pool.query('INSERT INTO lab_test_categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING', [cat]);
        }
        console.log('✅ Categories created/verified');

        // 2. Get category IDs
        const catRes = await pool.query('SELECT id, name FROM lab_test_categories');
        const catMap = {};
        catRes.rows.forEach(r => catMap[r.name] = r.id);

        // 3. Tests to seed
        const tests = [
            { name: 'Complete Blood Count (CBC)', cat: 'Haematology', price: 350 },
            { name: 'Hemoglobin', cat: 'Haematology', price: 80 },
            { name: 'ESR', cat: 'Haematology', price: 100 },
            { name: 'PT INR', cat: 'Haematology', price: 450 },
            { name: 'Blood Group & Rh', cat: 'Haematology', price: 200 },
            { name: 'Blood Sugar Fasting', cat: 'Biochemistry', price: 80 },
            { name: 'Blood Sugar PP', cat: 'Biochemistry', price: 80 },
            { name: 'Blood Sugar Random', cat: 'Biochemistry', price: 60 },
            { name: 'HbA1c', cat: 'Biochemistry', price: 550 },
            { name: 'Liver Function Test (LFT)', cat: 'Biochemistry', price: 850 },
            { name: 'Kidney Function Test (RFT)', cat: 'Biochemistry', price: 600 },
            { name: 'Lipid Profile', cat: 'Biochemistry', price: 800 },
            { name: 'Uric Acid', cat: 'Biochemistry', price: 250 },
            { name: 'Serum Creatinine', cat: 'Biochemistry', price: 200 },
            { name: 'BUN', cat: 'Biochemistry', price: 200 },
            { name: 'Electrolytes', cat: 'Biochemistry', price: 400 },
            { name: 'Vitamin D', cat: 'Biochemistry', price: 1200 },
            { name: 'Vitamin B12', cat: 'Biochemistry', price: 900 },
            { name: 'CRP', cat: 'Biochemistry', price: 500 },
            { name: 'Thyroid Profile (T3, T4, TSH)', cat: 'Endocrinology', price: 700 },
            { name: 'TSH', cat: 'Endocrinology', price: 350 },
            { name: 'T3', cat: 'Endocrinology', price: 250 },
            { name: 'T4', cat: 'Endocrinology', price: 250 },
            { name: 'Urine Routine', cat: 'Microbiology', price: 150 },
            { name: 'Urine Culture', cat: 'Microbiology', price: 500 },
            { name: 'Stool Routine', cat: 'Microbiology', price: 150 },
            { name: 'Dengue NS1', cat: 'Serology', price: 800 },
            { name: 'Dengue IgG/IgM', cat: 'Serology', price: 600 },
            { name: 'Malaria Antigen', cat: 'Serology', price: 400 },
            { name: 'Typhidot', cat: 'Serology', price: 350 },
            { name: 'Widal Test', cat: 'Serology', price: 200 },
            { name: 'HIV 1 & 2', cat: 'Serology', price: 350 },
            { name: 'HBsAg', cat: 'Serology', price: 400 },
            { name: 'Anti-HCV', cat: 'Serology', price: 600 },
            { name: 'Chest X-Ray', cat: 'Radiology', price: 400 },
            { name: 'ECG', cat: 'Radiology', price: 300 },
            { name: 'USG Abdomen', cat: 'Radiology', price: 800 },
            { name: '2D Echo', cat: 'Radiology', price: 1500 }
        ];

        let added = 0;
        for (const t of tests) {
            const result = await pool.query(
                `INSERT INTO lab_test_types (name, category_id, price) 
                 VALUES ($1, $2, $3) 
                 ON CONFLICT DO NOTHING 
                 RETURNING id`,
                [t.name, catMap[t.cat] || null, t.price]
            );
            if (result.rows.length > 0) {
                console.log(`  + ${t.name} (₹${t.price})`);
                added++;
            }
        }

        const count = await pool.query('SELECT COUNT(*) FROM lab_test_types');
        console.log(`\n🎉 Added ${added} new tests. Total lab tests: ${count.rows[0].count}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await pool.end();
    }
}

seedLabTests();
