// Script to create demo patients and invoices for billing demonstration
const pool = require('./config/db');

async function createDemoInvoices() {
    try {
        console.log('Creating demo patients and invoices...\n');

        // First, create some demo patients
        const patients = [
            { name: 'Rajesh Kumar', dob: '1979-05-15', gender: 'Male', phone: '9876543210', address: 'Mumbai' },
            { name: 'Priya Sharma', dob: '1992-08-22', gender: 'Female', phone: '9876543211', address: 'Delhi' },
            { name: 'Amit Patel', dob: '1966-03-10', gender: 'Male', phone: '9876543212', address: 'Ahmedabad' },
            { name: 'Sunita Devi', dob: '1957-11-28', gender: 'Female', phone: '9876543213', address: 'Kolkata' },
            { name: 'Mohammed Ishaq', dob: '1996-07-05', gender: 'Male', phone: '9876543214', address: 'Hyderabad' },
            { name: 'Ananya Reddy', dob: '2001-01-18', gender: 'Female', phone: '9876543215', address: 'Bangalore' },
            { name: 'Vikram Singh', dob: '1972-09-30', gender: 'Male', phone: '9876543216', address: 'Jaipur' },
            { name: 'Lakshmi Iyer', dob: '1983-04-12', gender: 'Female', phone: '9876543217', address: 'Chennai' },
        ];

        console.log('Creating patients...');
        for (const p of patients) {
            try {
                const result = await pool.query(
                    `INSERT INTO patients (name, dob, gender, phone, address) 
                     VALUES ($1, $2, $3, $4, $5) 
                     RETURNING id, name`,
                    [p.name, p.dob, p.gender, p.phone, p.address]
                );
                console.log(`✓ Created patient: ${result.rows[0].name}`);
            } catch (err) {
                if (err.code === '23505') {
                    console.log(`  Patient ${p.name} already exists (skipping)`);
                } else {
                    throw err;
                }
            }
        }

        // Get all patients for invoice creation
        const allPatients = await pool.query('SELECT id, name FROM patients ORDER BY name LIMIT 8');

        if (allPatients.rows.length === 0) {
            console.log('No patients found to create invoices for!');
            process.exit(1);
        }

        console.log(`\nFound ${allPatients.rows.length} patients. Creating invoices...`);

        // Create demo invoices with various statuses
        const invoiceData = [
            // Paid invoices (today's collection)
            { patient_idx: 0, amount: 2500, status: 'Paid', days_ago: 0 },
            { patient_idx: 1, amount: 8500, status: 'Paid', days_ago: 0 },
            { patient_idx: 2, amount: 15000, status: 'Paid', days_ago: 1 },

            // Pending invoices (need collection)
            { patient_idx: 3, amount: 45000, status: 'Pending', days_ago: 0 },
            { patient_idx: 4, amount: 3500, status: 'Pending', days_ago: 1 },
            { patient_idx: 5, amount: 12000, status: 'Pending', days_ago: 0 },
            { patient_idx: 6, amount: 75000, status: 'Pending', days_ago: 2 },

            // Overdue invoices (older pending - need urgent attention)
            { patient_idx: 7, amount: 125000, status: 'Pending', days_ago: 10 },
            { patient_idx: 0, amount: 5500, status: 'Pending', days_ago: 8 },
            { patient_idx: 1, amount: 22000, status: 'Pending', days_ago: 7 },
        ];

        for (const inv of invoiceData) {
            const patient = allPatients.rows[inv.patient_idx % allPatients.rows.length];
            const generatedAt = new Date();
            generatedAt.setDate(generatedAt.getDate() - inv.days_ago);

            const result = await pool.query(
                `INSERT INTO invoices (patient_id, total_amount, status, generated_at)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id`,
                [patient.id, inv.amount, inv.status, generatedAt]
            );

            const statusLabel = inv.days_ago > 5 && inv.status === 'Pending' ? 'OVERDUE' : inv.status;
            console.log(`✓ Invoice #${result.rows[0].id}: ${patient.name} - ₹${inv.amount.toLocaleString()} (${statusLabel})`);
        }

        console.log('\n=====================================');
        console.log('✅ Demo data created successfully!');
        console.log('=====================================');
        console.log(`Created: ${patients.length} patients, ${invoiceData.length} invoices`);
        console.log('- 3 Paid invoices (Today\'s collection)');
        console.log('- 4 Pending invoices (Need collection)');
        console.log('- 3 Overdue invoices (7+ days old)');
        console.log('=====================================');

        process.exit(0);
    } catch (err) {
        console.error('Error creating demo data:', err);
        process.exit(1);
    }
}

createDemoInvoices();
