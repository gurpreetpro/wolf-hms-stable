const pool = require('./config/db-cloud');

async function dropAllTables() {
    console.log('🧹 Dropping ALL tables in Cloud SQL...');
    
    // Get all table names
    const result = await pool.query(`
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    `);
    
    console.log(`Found ${result.rows.length} tables to drop`);
    
    // Drop each table
    for (const row of result.rows) {
        try {
            await pool.query(`DROP TABLE IF EXISTS "${row.tablename}" CASCADE`);
            console.log(`  ✓ Dropped ${row.tablename}`);
        } catch (e) {
            console.log(`  ✗ Error dropping ${row.tablename}: ${e.message}`);
        }
    }
    
    // Verify
    const verify = await pool.query(`SELECT COUNT(*) as count FROM pg_tables WHERE schemaname = 'public'`);
    console.log(`\n✅ Tables remaining: ${verify.rows[0].count}`);
    
    process.exit(0);
}

dropAllTables().catch(e => { console.error(e); process.exit(1); });
