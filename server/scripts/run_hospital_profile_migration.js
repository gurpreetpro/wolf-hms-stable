// Run hospital profile migration
const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

async function runMigration() {
    try {
        const sqlPath = path.join(__dirname, 'migrations', 'hospital_profile.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        console.log('Running hospital profile migration...');
        await pool.query(sql);
        console.log('✅ Hospital profile table created successfully!');

        // Verify the table
        const result = await pool.query('SELECT * FROM hospital_profile WHERE id = 1');
        if (result.rows.length > 0) {
            console.log('✅ Default hospital profile data inserted:');
            console.log(`   Name: ${result.rows[0].name}`);
            console.log(`   City: ${result.rows[0].city}`);
            console.log(`   Phone: ${result.rows[0].phone}`);
        }

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    }
}

runMigration();
