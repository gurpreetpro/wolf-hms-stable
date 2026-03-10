const pool = require('./config/db');

async function inspectSchema() {
    try {
        console.log('Inspecting schema...');
        
        const queries = [
            `SELECT column_name, data_type, character_maximum_length 
             FROM information_schema.columns 
             WHERE table_name = 'appointments' AND column_name = 'id'`,
             
            `SELECT column_name, data_type, character_maximum_length 
             FROM information_schema.columns 
             WHERE table_name = 'opd_queue' AND column_name = 'appointment_id'`
        ];

        for (const query of queries) {
            const res = await pool.query(query);
            if (res.rows.length > 0) {
                console.log(`Table: ${query.includes('opd_queue') ? 'opd_queue' : 'appointments'}`);
                console.log(JSON.stringify(res.rows[0], null, 2));
            } else {
                 console.log(`Column not found for query: ${query}`);
            }
        }
    } catch (err) {
        console.error('Error inspecting:', err);
    } finally {
        pool.end();
    }
}

inspectSchema();
