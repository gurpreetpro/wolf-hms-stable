// Fix legacy opd_visits data - use 'Completed' status for admitted patients
const pool = require('./config/db');

async function fix() {
    try {
        // Find patients in opd_visits who are actually admitted - update to 'Completed'
        const result = await pool.query(`
            UPDATE opd_visits v
            SET status = 'Completed'
            FROM admissions a
            WHERE v.patient_id = a.patient_id 
              AND a.status = 'Admitted'
              AND v.status IN ('Waiting', 'In Consultation')
              AND v.visit_date = CURRENT_DATE
            RETURNING v.id, v.status, (SELECT name FROM patients WHERE id = v.patient_id) as patient_name
        `);
        
        console.log('Fixed', result.rows.length, 'legacy opd_visits records:');
        result.rows.forEach(r => console.log('  -', r.patient_name, '-> Status:', r.status));
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

fix();
