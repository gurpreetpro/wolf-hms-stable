const { pool } = require('./db');

async function listAllTables() {
    try {
        const tables = await pool.query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name
        `);
        
        console.log('=== ALL PUBLIC TABLES ===\n');
        tables.rows.forEach((t, i) => console.log((i+1) + '. ' + t.table_name));
        console.log('\n=== Total:', tables.rows.length, 'tables ===');
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

listAllTables();
