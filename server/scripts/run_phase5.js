const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        console.log('Running Phase 5 Migration (Procurement)...');
        const sql = fs.readFileSync(path.join(__dirname, 'phase5_procurement.sql'), 'utf8');
        await pool.query(sql);
        console.log('✅ Phase 5 Migration Complete: Suppliers & PO tables created.');
        process.exit();
    } catch (err) {
        console.error('❌ Migration Failed:', err);
        process.exit(1);
    }
};

runMigration();
