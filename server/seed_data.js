const { Pool } = require('pg');
const pool = require('./config/db'); // Use existing pool config

async function seedData() {
    console.log('🌱 Starting standalone seed process...');

    try {
        // 1. Wards
        console.log('...Seeding Wards');
        await pool.query(`
            INSERT INTO wards (name, type, total_beds, available_beds, hospital_id) VALUES
            ('General Ward B', 'General', 20, 20, 1),
            ('Surgical Ward', 'Surgical', 18, 18, 1),
            ('NICU', 'NICU', 8, 8, 1),
            ('Emergency Ward', 'Emergency', 10, 10, 1)
            ON CONFLICT DO NOTHING
        `);

        // 2. Beds
        console.log('...Seeding Beds');
        const wards = await pool.query('SELECT id, total_beds FROM wards WHERE hospital_id = 1');
        for (const ward of wards.rows) {
            for (let i = 1; i <= Math.min(ward.total_beds, 4); i++) {
                await pool.query(`
                    INSERT INTO beds (ward_id, bed_number, status, hospital_id)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT DO NOTHING
                `, [ward.id, `B-${ward.id}-${i}`, i <= 2 ? 'Occupied' : 'Available', 1]);
            }
        }

        // 3. Patients
        console.log('...Seeding Patients');
        const patientsData = [
            ['Rajesh Kumar', '1985-03-15', 'Male', '9876543210'],
            ['Priya Sharma', '1990-07-22', 'Female', '9876543211'],
            ['Amit Patel', '1978-11-08', 'Male', '9876543212'],
            ['Sunita Devi', '1965-05-30', 'Female', '9876543213'],
            ['Vikram Singh', '1995-01-12', 'Male', '9876543214']
        ];
        
        for (const p of patientsData) {
            // Check if exists first to avoid duplicates
            const check = await pool.query('SELECT 1 FROM patients WHERE name = $1', [p[0]]);
            if (check.rows.length === 0) {
                 await pool.query(`
                    INSERT INTO patients (name, dob, gender, phone, hospital_id)
                    VALUES ($1, $2, $3, $4, $5)
                `, [...p, 1]);
            }
        }

        // 4. Appointments
        console.log('...Seeding Appointments');
        await pool.query(`
            INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, hospital_id)
            SELECT 
                p.id,
                (SELECT id FROM users WHERE role = 'doctor' LIMIT 1),
                CURRENT_DATE + 1,
                'Scheduled',
                'General Checkup',
                1
            FROM patients p
            WHERE p.hospital_id = 1
            LIMIT 5
            ON CONFLICT DO NOTHING
        `);

        // 5. Admissions
        console.log('...Seeding Admissions');
        // Get valid patients and wards
        const patients = await pool.query('SELECT id FROM patients WHERE hospital_id = 1 LIMIT 3');
        const wardId = wards.rows[0].id; // Use first ward
        
        for (let i = 0; i < patients.rows.length; i++) {
            await pool.query(`
               INSERT INTO admissions (patient_id, ward, bed_number, admission_date, status, hospital_id)
               VALUES ($1, $2, $3, NOW(), 'Admitted', 1)
            `, [patients.rows[i].id, 'General Ward B', `B-${wardId}-${i+1}`]);
            
            // Update bed status
             await pool.query(`
                UPDATE beds SET status = 'Occupied' WHERE bed_number = $1
            `, [`B-${wardId}-${i+1}`]);
        }

        // 6. Lab Test Types
        console.log('...Seeding Lab Test Types');
        const labTests = [
            ['Complete Blood Count (CBC)', 350, 'N/A'],
            ['Blood Sugar (Fasting)', 100, '70-100'],
            ['Lipid Profile', 600, 'N/A'],
            ['ECG', 250, 'N/A']
        ];
        
        for (const t of labTests) {
            const check = await pool.query('SELECT 1 FROM lab_test_types WHERE name = $1 AND hospital_id = 1', [t[0]]);
            if (check.rows.length === 0) {
                await pool.query(`
                    INSERT INTO lab_test_types (name, price, normal_range, hospital_id) 
                    VALUES ($1, $2, $3, 1)
                `, t);
            }
        }

        // 7. Lab Requests
        console.log('...Seeding Lab Requests');
        await pool.query(`
            INSERT INTO lab_requests (patient_id, status, hospital_id)
            SELECT id, 'Pending', 1 FROM patients WHERE hospital_id = 1 LIMIT 3
        `);

        // 8. OPD Visits
        console.log('...Seeding OPD Visits');
        await pool.query(`
            INSERT INTO opd_visits (patient_id, doctor_id, token_number, status, visit_date, hospital_id)
            SELECT 
                p.id,
                (SELECT id FROM users WHERE role = 'doctor' LIMIT 1),
                1,
                'Waiting',
                CURRENT_DATE,
                1
            FROM patients p
            WHERE p.hospital_id = 1
            LIMIT 1
        `);

        // 9. Finance (Invoices & Payments)
        console.log('...Seeding Finance (Invoices/Payments)');
        const admissions = await pool.query('SELECT id, patient_id FROM admissions WHERE hospital_id = 1 LIMIT 3');
        const adminUser = await pool.query('SELECT id FROM users WHERE role = \'admin\' LIMIT 1');
        
        for (const adm of admissions.rows) {
            // Create Invoice
            const invRes = await pool.query(`
                INSERT INTO invoices (admission_id, patient_id, total_amount, amount_paid, status, generated_at, generated_by, hospital_id)
                VALUES ($1, $2, $3, $4, $5, NOW() - INTERVAL '2 days', $6, 1)
                RETURNING id
            `, [adm.id, adm.patient_id, 1500.00, 500.00, 'Partial', adminUser.rows[0].id]);
            
            const invId = invRes.rows[0].id;

            // Invoice Items
            await pool.query(`
                INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id)
                VALUES 
                ($1, 'Room Charges', 2, 500, 1000, 1),
                ($1, 'Consultation', 1, 500, 500, 1)
            `, [invId]);


            // Payments
            // Check if payments table exists first
            const payTable = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'payments'");
            if (payTable.rows.length > 0) {
                 await pool.query(`
                    INSERT INTO payments (invoice_id, amount, payment_mode, reference_number, received_by, hospital_id)
                    VALUES ($1, $2, 'Cash', $3, $4, 1)
                `, [invId, 500.00, 'REF' + invId, adminUser.rows[0].id]);
            }
        }

        // 10. Pharmacy / Inventory Items
        console.log('...Seeding Inventory Items (Pharmacy)');
        const inventoryItems = [
            ['Paracetamol 500mg', 'BATCH001', '2026-12-31', 1000, 0.50],
            ['Amoxicillin 500mg', 'BATCH002', '2025-06-30', 500, 1.20],
            ['IV Fluid NS', 'BATCH003', '2025-12-31', 200, 5.00],
            ['Metformin 500mg', 'BATCH005', '2026-03-20', 600, 0.40]
        ];

        for (const item of inventoryItems) {
             // Check duplication
             const check = await pool.query('SELECT 1 FROM inventory_items WHERE name = $1 AND hospital_id = 1', [item[0]]);
             if (check.rows.length === 0) {
                 await pool.query(`
                    INSERT INTO inventory_items (name, batch_number, expiry_date, stock_quantity, price_per_unit, hospital_id)
                    VALUES ($1, $2, $3, $4, $5, 1)
                 `, item);
             }
        }

        // 11. Lab Reagents (Attempt to seed if table exists)
        const reagentTable = await pool.query("SELECT 1 FROM information_schema.tables WHERE table_name = 'lab_reagents'");
        if (reagentTable.rows.length > 0) {
            console.log('...Seeding Lab Reagents');
             await pool.query(`
                INSERT INTO lab_reagents (name, current_stock, min_stock_level, unit, hospital_id)
                VALUES 
                ('WBC Diluting Fluid', 500, 100, 'ml', 1),
                ('RBC Diluting Fluid', 450, 100, 'ml', 1),
                ('Lysing Solution', 200, 50, 'ml', 1)
                ON CONFLICT DO NOTHING
            `);
        } else {
             console.log('Skipping Lab Reagents (table not found)');
        }

        console.log('✅ Seed data insertion completed!');
        process.exit(0);

    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
}

seedData();
