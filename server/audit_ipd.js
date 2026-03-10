// Query database for IPD data sources
const pool = require('./config/db');

async function audit() {
    try {
        console.log('=== IPD DATA AUDIT ===\n');
        
        // 1. Order Sets
        const orderSets = await pool.query('SELECT id, name, category FROM order_sets');
        console.log('ORDER_SETS Table:', orderSets.rows.length, 'rows');
        orderSets.rows.forEach(r => console.log('  -', r.name));
        
        // 2. Care Plan Templates  
        const templates = await pool.query('SELECT id, name, hospital_id FROM care_plan_templates');
        console.log('\nCARE_PLAN_TEMPLATES Table:', templates.rows.length, 'rows');
        templates.rows.forEach(r => console.log('  -', r.name, '(hospital_id:', r.hospital_id, ')'));
        
        // 3. OPD Queue Status
        const queue = await pool.query('SELECT id, patient_id, status, hospital_id FROM opd_queue ORDER BY id DESC LIMIT 5');
        console.log('\nOPD_QUEUE (last 5):', queue.rows.length, 'rows');
        queue.rows.forEach(r => console.log('  - ID:', r.id, 'Status:', r.status, 'Hospital:', r.hospital_id));
        
        // 4. Admissions for the patient
        const admissions = await pool.query(`
            SELECT a.id, a.patient_id, a.status, p.name
            FROM admissions a
            JOIN patients p ON a.patient_id = p.id
            WHERE a.status = 'Admitted' LIMIT 5
        `);
        console.log('\nACTIVE ADMISSIONS:', admissions.rows.length);
        admissions.rows.forEach(r => console.log('  -', r.name, '(Status:', r.status, ')'));
        
        // 5. Discharge Plans
        const dischargePlans = await pool.query('SELECT * FROM discharge_plans LIMIT 5');
        console.log('\nDISCHARGE_PLANS:', dischargePlans.rows.length);
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

audit();
