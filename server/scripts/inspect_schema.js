const { pool } = require('../db');

async function inspect() {
    try {
        const res = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'patients' AND column_name = 'id'
        `);
        console.log('Patients ID Type:', res.rows[0].data_type);

        const res2 = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'surgeries' AND column_name = 'patient_id'
        `);
        console.log('Surgeries Patient_ID Type:', res2.rows[0].data_type);
    } catch (err) {
        console.error(err);
    }
    process.exit(0);
}

inspect();
