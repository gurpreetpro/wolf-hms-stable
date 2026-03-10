const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hms_db',
    password: 'admin123',
    port: 5432
});

async function runMigration() {
    try {
        console.log('📋 Running lab tests migration...');

        const sqlPath = path.join(__dirname, 'migrations', '007_seed_lab_tests.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        await pool.query(sql);

        // Verify the data
        const result = await pool.query('SELECT COUNT(*) FROM lab_test_types');
        console.log(`✅ Migration complete! ${result.rows[0].count} lab tests seeded.`);

        // Show categories
        const categories = await pool.query('SELECT name, COUNT(t.id) as test_count FROM lab_test_categories c LEFT JOIN lab_test_types t ON c.id = t.category_id GROUP BY c.name ORDER BY c.name');
        console.log('\n📊 Lab Test Categories:');
        categories.rows.forEach(cat => {
            console.log(`   ${cat.name}: ${cat.test_count} tests`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        console.error(err);
        process.exit(1);
    }
}

runMigration();
