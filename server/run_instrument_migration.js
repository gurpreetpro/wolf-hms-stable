require('dotenv').config();
const pool = require('./config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    const sql = fs.readFileSync(path.join(__dirname, '../pgsql/migrations/107_fix_instrument_tables.sql'), 'utf8');
    
    try {
        console.log('Running instrument tables migration...');
        await pool.query(sql);
        console.log('✅ Migration complete!');
        
        // Verify
        const drivers = await pool.query('SELECT id, manufacturer, model, protocol FROM instrument_drivers LIMIT 5');
        console.log('\nSeeded drivers:');
        console.log(drivers.rows);
        
        const logs = await pool.query("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'instrument_comm_log')");
        console.log('\ninstrument_comm_log exists:', logs.rows[0].exists);
        
    } catch (error) {
        console.error('Migration error:', error.message);
    }
    process.exit(0);
}

runMigration();
