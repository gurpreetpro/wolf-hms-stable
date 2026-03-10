/**
 * Seed Script: Create Proper Demo Patients for Billing Training
 * Includes complete patient profile info and invoice items
 */

const { Pool } = require('pg');

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'hospital_db',
    password: 'Hospital456!',
    port: 5432
});

async function seed() {
    console.log('🔌 Connecting to hospital_db...');
    
    try {
        const testRes = await pool.query('SELECT current_database() as db');
        console.log(`✅ Connected to: ${testRes.rows[0].db}\n`);

        // Clean up old demo data
        console.log('🧹 Cleaning previous demo data...');
        await pool.query("DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE '%Billing Demo%'))");
        await pool.query("DELETE FROM invoices WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE '%Billing Demo%')");
        await pool.query("DELETE FROM admissions WHERE patient_id IN (SELECT id FROM patients WHERE name LIKE '%Billing Demo%')");
        await pool.query("DELETE FROM patients WHERE name LIKE '%Billing Demo%'");
        console.log('   Done\n');

        const demos = [
            { name: 'Rahul Sharma (Billing Demo)', phone: '9876500001', gender: 'M', dob: '1985-05-15', days: 3 },
            { name: 'Priya Singh (Billing Demo)', phone: '9876500002', gender: 'F', dob: '1990-08-22', days: 5 },
            { name: 'Amit Kumar (Billing Demo)', phone: '9876500003', gender: 'M', dob: '1978-11-10', days: 2 },
            { name: 'Sunita Devi (Billing Demo)', phone: '9876500004', gender: 'F', dob: '1965-03-28', days: 7 }
        ];

        for (let i = 0; i < demos.length; i++) {
            const d = demos[i];
            const rate = 1500;
            const total = rate * d.days;
            const bed = `Demo-${i + 1}`;
            const ward = 'General Ward';

            try {
                // Insert patient with full profile
                const pRes = await pool.query(
                    `INSERT INTO patients (name, phone, gender, dob, address, hospital_id) 
                     VALUES ($1, $2, $3, $4, $5, 1) RETURNING id`,
                    [d.name, d.phone, d.gender, d.dob, 'Demo Address, Test City']
                );
                const patientId = pRes.rows[0].id;

                // Insert admission
                const aRes = await pool.query(
                    `INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date, hospital_id) 
                     VALUES ($1, $2, $3, 'Discharged', NOW() - INTERVAL '${d.days} days', 1) RETURNING id`,
                    [patientId, ward, bed]
                );
                const admissionId = aRes.rows[0].id;

                // Insert invoice
                const iRes = await pool.query(
                    `INSERT INTO invoices (patient_id, admission_id, total_amount, amount_paid, status, generated_by, hospital_id, generated_at) 
                     VALUES ($1, $2, $3, 0, 'Pending', 1, 1, NOW()) RETURNING id`,
                    [patientId, admissionId, total]
                );
                const invoiceId = iRes.rows[0].id;

                // Insert invoice item (charge breakdown)
                await pool.query(
                    `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id) 
                     VALUES ($1, $2, $3, $4, $5, 1)`,
                    [invoiceId, `${ward} - Bed Charges (${d.days} days @ ₹${rate}/day)`, d.days, rate, total]
                );

                console.log(`✅ ${d.name}: Invoice #${invoiceId} = ₹${total}`);
                console.log(`   📞 ${d.phone} | ${d.gender} | 🏥 ${ward} | 🛏️ ${bed}`);
            } catch (err) {
                console.log(`❌ ${d.name}: ${err.message}`);
            }
        }

        console.log('\n--- Now adding Lab Patients ---\n');

        // Lab patients with lab test charges
        const labPatients = [
            { name: 'Ravi Patel (Lab Demo)', phone: '9876500011', gender: 'M', dob: '1992-04-10', tests: ['CBC (Complete Blood Count)', 'Blood Sugar Fasting'], prices: [450, 120] },
            { name: 'Meena Sharma (Lab Demo)', phone: '9876500012', gender: 'F', dob: '1988-12-05', tests: ['Thyroid Profile (T3, T4, TSH)', 'Lipid Profile'], prices: [850, 650] },
            { name: 'Vikram Singh (Lab Demo)', phone: '9876500013', gender: 'M', dob: '1975-07-18', tests: ['Liver Function Test (LFT)', 'Kidney Function Test'], prices: [750, 890] },
            { name: 'Anjali Gupta (Lab Demo)', phone: '9876500014', gender: 'F', dob: '2000-01-25', tests: ['HbA1c', 'Urine Routine'], prices: [550, 150] }
        ];

        for (let i = 0; i < labPatients.length; i++) {
            const d = labPatients[i];
            const total = d.prices.reduce((sum, p) => sum + p, 0);

            try {
                // Insert patient
                const pRes = await pool.query(
                    `INSERT INTO patients (name, phone, gender, dob, address, hospital_id) 
                     VALUES ($1, $2, $3, $4, $5, 1) RETURNING id`,
                    [d.name, d.phone, d.gender, d.dob, 'Lab Patient Address, Test City']
                );
                const patientId = pRes.rows[0].id;

                // Insert invoice (no admission for OPD/lab patients)
                const iRes = await pool.query(
                    `INSERT INTO invoices (patient_id, admission_id, total_amount, amount_paid, status, generated_by, hospital_id, generated_at) 
                     VALUES ($1, NULL, $2, 0, 'Pending', 1, 1, NOW()) RETURNING id`,
                    [patientId, total]
                );
                const invoiceId = iRes.rows[0].id;

                // Insert invoice items (lab tests)
                for (let j = 0; j < d.tests.length; j++) {
                    await pool.query(
                        `INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price, hospital_id) 
                         VALUES ($1, $2, 1, $3, $3, 1)`,
                        [invoiceId, `🧪 ${d.tests[j]}`, d.prices[j]]
                    );
                }

                console.log(`✅ ${d.name}: Invoice #${invoiceId} = ₹${total}`);
                console.log(`   📞 ${d.phone} | ${d.gender} | Lab Tests: ${d.tests.join(', ')}`);
            } catch (err) {
                console.log(`❌ ${d.name}: ${err.message}`);
            }
        }

        console.log('\n🎉 Demo billing patients seeded successfully!');
        console.log('   - 4 Bed charge patients (IPD)')
        console.log('   - 4 Lab test patients (OPD)')
        console.log('   Refresh the Finance Dashboard to see the enhanced payment modal.\n');

    } catch (err) {
        console.error('Fatal error:', err.message);
    } finally {
        await pool.end();
    }
}

seed();
