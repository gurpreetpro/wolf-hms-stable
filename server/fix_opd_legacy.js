// Fix legacy OPD data - update admitted patients' queue status
const pool = require('./config/db');

async function fix() {
    try {
        // Find patients in OPD queue who are actually admitted
        const result = await pool.query(`
            UPDATE opd_queue oq
            SET status = 'Admitted'
            FROM admissions a
            WHERE oq.patient_id = a.patient_id 
              AND a.status = 'Admitted'
              AND oq.status IN ('Waiting', 'In Consultation')
            RETURNING oq.id, oq.status, (SELECT name FROM patients WHERE id = oq.patient_id) as patient_name
        `);
        
        console.log('Fixed', result.rows.length, 'legacy OPD records:');
        result.rows.forEach(r => console.log('  -', r.patient_name, '-> Status:', r.status));
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

fix();
