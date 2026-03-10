const pool = require('../config/db');
const { addToInvoice } = require('../services/billingService');

const BED_RATES = {
    'General': 1500,
    'Semi-Private': 3000,
    'Private': 5000,
    'ICU': 8000
};

const runManual = async () => {
    try {
        console.log('--- MANUAL CRON TEST ---');
        
        // Setup User/Patient
        const userCheck = await pool.query("SELECT id FROM users WHERE id = 1");
        if (userCheck.rows.length === 0) {
            await pool.query("INSERT INTO users (id, username, password, role, hospital_id) VALUES (1, 'system_admin', 'hash', 'admin', 1)");
        }
        
        const patRes = await pool.query("INSERT INTO patients (name, phone, gender, dob, hospital_id) VALUES ('Manual Cron', '9999999999', 'Male', '1990-01-01', 1) RETURNING id");
        const patientId = patRes.rows[0].id;
        
        const admRes = await pool.query("INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, hospital_id) VALUES ($1, 'General', 'TEST-BED-M', 'Admitted', NOW() - INTERVAL '2 days', 1) RETURNING id", [patientId]);
        const admissionId = admRes.rows[0].id;
        
        console.log(`Created Patient ${patientId}, Admission ${admissionId}`);

        // LOGIC REPLICATION
        const activeAdmissions = await pool.query(
            "SELECT * FROM admissions WHERE status = 'Admitted' AND id = $1", 
            [admissionId] // Scoping to just our test admission to avoid legacy data noise
        );
        
        console.log(`Processing ${activeAdmissions.rows.length} admissions`);

        for (const patient of activeAdmissions.rows) {
            console.log('Patient Row:', patient);
            
            if (!patient.patient_id || !patient.hospital_id) {
                console.warn('Skipping due to missing ID');
                continue;
            }

            const rate = BED_RATES[patient.ward] || 1500;
            const description = `Bed Charge: ${patient.ward} - Nightly`;
            
            console.log('Calling addToInvoice with:', patient.patient_id, patient.id, description, 1, rate, 1, patient.hospital_id);
            
            const invId = await addToInvoice(
                patient.patient_id,
                patient.id,
                description,
                1,
                rate,
                1,
                patient.hospital_id
            );
            console.log('Charged Invoice:', invId);
        }

        // Cleanup
        await pool.query('DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id = $1)', [patientId]);
        await pool.query('DELETE FROM invoices WHERE patient_id = $1', [patientId]);
        await pool.query('DELETE FROM admissions WHERE id = $1', [admissionId]);
        await pool.query('DELETE FROM patients WHERE id = $1', [patientId]);
        console.log('Cleanup Done');

    } catch (e) {
        console.error('MANUAL ERROR:', e);
    } finally {
        pool.end();
    }
};

runManual();
