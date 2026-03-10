const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'phase8_lab_enhancements.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Phase 8 (Lab Enhancements) migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    }
};

runMigration();
