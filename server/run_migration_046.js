const fs = require('fs');
const path = require('path');
const pool = require('./config/db');

const migrate = async () => {
    try {
        console.log('Running Migration 046...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '046_housekeeping_schema.sql'), 'utf8');
        await pool.query(sql);
        console.log('Migration 046: Housekeeping Tables created successfully.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
};

migrate();
