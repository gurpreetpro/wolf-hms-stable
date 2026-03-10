const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'phase4_nurse_extension.sql'), 'utf8');
        console.log('Running Nurse Extension Migration...');
        await pool.query(sql);
        console.log('Migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

runMigration();
