const { pool } = require('../db');

async function inspect() {
    try {
        console.log('Inspecting admissions table...');
        
        // precise column info
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'admissions';
        `);
        console.log('Columns in admissions:', res.rows);

        // Check if it is a view
        const viewRes = await pool.query(`
             SELECT table_type 
             FROM information_schema.tables 
             WHERE table_name = 'admissions';
        `);
        console.log('Table Type:', viewRes.rows);

        console.log('Inspecting beds table...');
         const bedRes = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'beds';
        `);
        console.log('Columns in beds:', bedRes.rows);

        process.exit(0);
    } catch (err) {
        console.error('Inspection failed:', err);
        process.exit(1);
    }
}

inspect();
