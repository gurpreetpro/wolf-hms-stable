// Check and fix vitals_logs schema
const pool = require('./config/db');

async function fixVitalsLogs() {
    try {
        // Check current columns
        const cols = await pool.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'vitals_logs'
            ORDER BY ordinal_position
        `);

        console.log('Current vitals_logs columns:');
        cols.rows.forEach(c => console.log('  - ' + c.column_name));

        const hasCreatedAt = cols.rows.some(c => c.column_name === 'created_at');
        const hasRecordedAt = cols.rows.some(c => c.column_name === 'recorded_at');

        if (!hasCreatedAt && hasRecordedAt) {
            console.log('\n⚠️ Missing created_at but has recorded_at');
            console.log('Adding alias column...');
            // Add created_at as alias or link
            await pool.query(`ALTER TABLE vitals_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMP`);
            // Copy data from recorded_at if it exists
            await pool.query(`UPDATE vitals_logs SET created_at = recorded_at WHERE created_at IS NULL`);
            // Set default
            await pool.query(`ALTER TABLE vitals_logs ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP`);
            console.log('✅ created_at column added!');
        } else if (!hasCreatedAt) {
            console.log('\n⚠️ Missing created_at column!');
            await pool.query(`ALTER TABLE vitals_logs ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP`);
            console.log('✅ created_at column added!');
        } else {
            console.log('\n✅ created_at column already exists');
        }

    } catch (e) {
        console.error('Error:', e.message);
    }

    process.exit(0);
}

fixVitalsLogs();
