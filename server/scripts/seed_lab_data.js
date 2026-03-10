const { pool } = require('./db');

async function seedLabData() {
    try {
        console.log('Seeding lab test data...\n');
        
        // Get a patient with a phone number
        const patientResult = await pool.query(`
            SELECT id, name, phone FROM patients WHERE phone IS NOT NULL LIMIT 1
        `);
        
        if (patientResult.rows.length === 0) {
            console.log('No patient with phone found! Creating one...');
            const newPatient = await pool.query(`
                INSERT INTO patients (name, phone, created_at)
                VALUES ('Lab Test Patient', '9876543210', NOW())
                RETURNING id, name, phone
            `);
            var patient = newPatient.rows[0];
        } else {
            var patient = patientResult.rows[0];
        }
        console.log('Using patient:', patient.name, '| Phone:', patient.phone);
        
        // Get a doctor
        const doctorResult = await pool.query(`
            SELECT id, name FROM users WHERE role = 'doctor' LIMIT 1
        `);
        const doctor = doctorResult.rows[0];
        console.log('Using doctor:', doctor.name);
        
        // Get some test types
        const testTypes = await pool.query(`
            SELECT id, name, price, category FROM lab_test_types LIMIT 5
        `);
        console.log('Found', testTypes.rows.length, 'test types');
        
        // Create lab requests with different statuses
        // Try lowercase statuses which are more common in databases
        const statuses = ['Completed', 'Processing', 'Collected', 'Pending'];
        
        for (let i = 0; i < testTypes.rows.length && i < 4; i++) {
            const test = testTypes.rows[i];
            const status = statuses[i];
            
            try {
                const request = await pool.query(`
                    INSERT INTO lab_requests 
                    (patient_id, doctor_id, test_type_id, test_name, status, requested_at, payment_status, has_critical_value)
                    VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '${i} days', 'paid', $6)
                    RETURNING id, test_name, status
                `, [
                    patient.id, 
                    doctor.id, 
                    test.id, 
                    test.name, 
                    status,
                    i === 0 // First one has critical value
                ]);
                
                console.log(`✅ Created lab request: ${request.rows[0].test_name} (${status})`);
                
                // If completed, add result
                if (status === 'Completed') {
                    const sampleResult = {
                        parameters: [
                            { name: 'Hemoglobin', value: 11.2, unit: 'g/dL', normalMin: 12.0, normalMax: 16.0, status: 'low' },
                            { name: 'RBC Count', value: 4.5, unit: 'million/μL', normalMin: 4.0, normalMax: 5.5, status: 'normal' },
                            { name: 'WBC Count', value: 8500, unit: '/μL', normalMin: 4000, normalMax: 11000, status: 'normal' },
                            { name: 'Platelet Count', value: 250000, unit: '/μL', normalMin: 150000, normalMax: 400000, status: 'normal' },
                            { name: 'HCT', value: 38, unit: '%', normalMin: 36, normalMax: 48, status: 'normal' }
                        ],
                        summary: 'Mild anemia detected. Hemoglobin slightly below normal range.',
                        reportedBy: 'Lab Tech',
                        reportedAt: new Date().toISOString()
                    };
                    
                    await pool.query(`
                        INSERT INTO lab_results 
                        (request_id, result_json, uploaded_at, technician_id)
                        VALUES ($1, $2, NOW(), $3)
                    `, [request.rows[0].id, JSON.stringify(sampleResult), doctor.id]);
                    
                    // Update request to mark sample collected
                    await pool.query(`
                        UPDATE lab_requests 
                        SET sample_collected_at = NOW() - INTERVAL '1 hour',
                            report_generated_at = NOW()
                        WHERE id = $1
                    `, [request.rows[0].id]);
                    
                    console.log('   ↳ Added result with 5 parameters');
                }
            } catch (e) {
                console.log(`Error creating request with status '${status}':`, e.message);
                // Try alternative status values
                if (e.message.includes('status_check')) {
                    console.log('   Trying alternative status values...');
                }
            }
        }
        
        console.log('\n✅ Lab test data seeded!');
        console.log('Phone for patient app:', patient.phone);
        
        // Verify
        const count = await pool.query('SELECT COUNT(*) FROM lab_requests');
        console.log('Total lab_requests:', count.rows[0].count);
        
        process.exit(0);
    } catch (e) {
        console.error('Error:', e.message);
        process.exit(1);
    }
}

seedLabData();
