/**
 * Run migration 500: Unified Staff Locations
 */
const fs = require('fs');
const path = require('path');
const pool = require('./db');

async function run() {
    const sqlPath = path.join(__dirname, 'migrations', '500_unified_staff_locations.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('[MIGRATE] Running 500_unified_staff_locations.sql...');
    await pool.query(sql);
    console.log('[MIGRATE] Migration SQL executed successfully.');
    
    // Verify table created
    const tableCheck = await pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_name = 'staff_locations'"
    );
    console.log('[MIGRATE] staff_locations table exists:', tableCheck.rows.length > 0);
    
    // Verify view created
    const viewCheck = await pool.query(
        "SELECT table_name FROM information_schema.views WHERE table_name = 'staff_latest_locations'"
    );
    console.log('[MIGRATE] staff_latest_locations view exists:', viewCheck.rows.length > 0);
    
    // Verify indexes
    const idxCheck = await pool.query(
        "SELECT indexname FROM pg_indexes WHERE tablename = 'staff_locations'"
    );
    console.log('[MIGRATE] Indexes:', idxCheck.rows.map(r => r.indexname).join(', '));
    
    console.log('[MIGRATE] Done!');
    process.exit(0);
}

run().catch(e => {
    console.error('[MIGRATE] ERROR:', e.message);
    process.exit(1);
});
