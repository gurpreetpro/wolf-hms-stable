const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        console.log('Running Phase 8 Migration (Refunds)...');
        const sql = fs.readFileSync(path.join(__dirname, 'phase8_refunds.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Phase 8 Migration Complete: Payments table updated.');
        process.exit();
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

runMigration();
