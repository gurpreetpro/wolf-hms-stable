const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Cloud SQL Connection (User must provide env vars or use proxy)
const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || '127.0.0.1',
    database: process.env.DB_NAME || 'wolf_hms_db',
    password: process.env.DB_PASSWORD || 'password123',
    port: process.env.DB_PORT || 5432,
});

const MIGRATIONS = [
    // Phase 1-5 Phoenix Upgrade
    '107_ledger_phase1.sql',
    '108_alert_notes.sql',
    '109_clma_schema.sql',
    '110_care_tasks_audit.sql',
    '111_bed_management.sql',
    '112_ledger_phase2.sql',
    '113_fix_payments_schema.sql',
    '114_accounting_periods.sql',
    '115_digital_sbar.sql',
    // Phase 6-7 Security Redesign
    '331_security_hospital_isolation.sql',
    // Phase 8 Data Migration (Wolf Migrator)
    '116_wolf_migrator.sql',
    // Phase 9: Payment Gateway
    '413_payment_transactions.sql'
];

async function applyMigrations() {
    console.log('🔗 Connecting to Database...');
    const client = await pool.connect();
    try {
        console.log('✅ Connected.');
        await client.query('BEGIN');

        for (const file of MIGRATIONS) {
            console.log(`📜 Applying ${file}...`);
            const filePath = path.join(__dirname, 'migrations', file);
            if (fs.existsSync(filePath)) {
                const sql = fs.readFileSync(filePath, 'utf8');
                await client.query(sql);
                console.log(`   -> Success.`);
            } else {
                console.error(`   -> ❌ File not found: ${file}`);
            }
        }

        await client.query('COMMIT');
        console.log('🚀 All migrations applied successfully!');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('❌ Migration Failed:', e);
    } finally {
        client.release();
        pool.end();
    }
}

applyMigrations();
