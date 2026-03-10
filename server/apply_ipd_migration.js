// Apply IPD missing tables migration
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function apply() {
    try {
        const sql = fs.readFileSync(path.join(__dirname, 'migrations', '212_ipd_missing_tables.sql'), 'utf8');
        console.log('Applying IPD tables migration...');
        await pool.query(sql);
        console.log('✅ Migration applied successfully');
        
        // Verify
        const tables = await pool.query(`
            SELECT table_name, COUNT(*) as columns 
            FROM information_schema.columns 
            WHERE table_name IN ('discharge_plans', 'handoff_reports')
            GROUP BY table_name
        `);
        tables.rows.forEach(t => console.log(`  ${t.table_name}: ${t.columns} columns`));
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

apply();
