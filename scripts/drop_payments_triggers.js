const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'wolf_hms_db',
    password: process.env.DB_PASSWORD || 'postgres',
    port: process.env.DB_PORT || 5432,
});

async function dropTriggers() {
    try {
        const client = await pool.connect();
        
        const res = await client.query(`
            SELECT trigger_name 
            FROM information_schema.triggers 
            WHERE event_object_table = 'payments'
        `);
        
        for (const row of res.rows) {
            console.log(`Dropping trigger: ${row.trigger_name}`);
            await client.query(`DROP TRIGGER IF EXISTS "${row.trigger_name}" ON payments`);
        }
        
        console.log('All triggers dropped from payments.');
        client.release();
    } catch (e) {
        console.error('Error:', e);
    } finally {
        pool.end();
    }
}

dropTriggers();
