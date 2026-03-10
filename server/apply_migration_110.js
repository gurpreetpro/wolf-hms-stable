const { pool } = require('./config/db');
const fs = require('fs');
const path = require('path');

const applyMigration = async () => {
    const client = await pool.connect();
    try {
        console.log('Applying migration 110...');
        const sql = fs.readFileSync(path.join(__dirname, 'migrations/110_care_tasks_audit.sql'), 'utf8');
        await client.query(sql);
        console.log('Migration 110 applied successfully.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        client.release();
        process.exit();
    }
};

applyMigration();
