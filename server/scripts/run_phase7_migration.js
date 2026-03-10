const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

const runMigration = async () => {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'phase7_pharmacist_features.sql'), 'utf8');
        await pool.query(sql);
        console.log('Phase 7 Migration (Pharmacist Features) executed successfully');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        pool.end();
    }
};

runMigration();
