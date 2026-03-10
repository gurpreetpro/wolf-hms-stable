/**
 * Seed Demo IPD (In-Patient Department) Patients
 * Creates test patients with admissions, vitals, and care tasks for testing the Smart Ward Dashboard
 */

const pool = require('./config/db');

const demoPatients = [
    {
        name: 'Rajesh Kumar',
        age: 55,
        gender: 'Male',
        phone: '9876543210',
        address: '45, MG Road, Bangalore',
        ward: 'General Ward',
        bed: 'GW-1',
        diagnosis: 'Pneumonia with COPD exacerbation',
        vitals: { bp: '140/90', temp: '101.2', spo2: '92', heart_rate: '105' }, // High NEWS2
        riskLevel: 'HIGH'
    },
    {
        name: 'Priya Sharma',
        age: 32,
        gender: 'Female',
        phone: '9876543211',
        address: '12, Residency Road, Bangalore',
        ward: 'General Ward',
        bed: 'GW-2',
        diagnosis: 'Post-operative cholecystectomy Day 2',
        vitals: { bp: '118/76', temp: '98.4', spo2: '99', heart_rate: '78' }, // Normal
        riskLevel: 'LOW'
    },
    {
        name: 'Mohammed Ali',
        age: 68,
        gender: 'Male',
        phone: '9876543212',
        address: '78, Commercial Street, Bangalore',
        ward: 'ICU',
        bed: 'ICU-1',
        diagnosis: 'Acute MI - Post PCI monitoring',
        vitals: { bp: '100/60', temp: '99.8', spo2: '94', heart_rate: '110' }, // Medium-High
        riskLevel: 'MEDIUM'
    },
    {
        name: 'Lakshmi Devi',
        age: 45,
        gender: 'Female',
        phone: '9876543213',
        address: '23, Jayanagar, Bangalore',
        ward: 'General Ward',
        bed: 'GW-3',
        diagnosis: 'Diabetic Ketoacidosis - Recovering',
        vitals: { bp: '130/80', temp: '99.0', spo2: '97', heart_rate: '88' }, // Low-Medium
        riskLevel: 'LOW'
    },
    {
        name: 'Venkatesh Rao',
        age: 72,
        gender: 'Male',
        phone: '9876543214',
        address: '56, Indiranagar, Bangalore',
        ward: 'ICU',
        bed: 'ICU-2',
        diagnosis: 'Sepsis secondary to UTI',
        vitals: { bp: '85/50', temp: '103.5', spo2: '88', heart_rate: '125' }, // Critical
        riskLevel: 'HIGH'
    }
];

const seedIPDPatients = async () => {
    console.log('🏥 Seeding Demo IPD Patients for Smart Ward...');

    try {
        for (const patient of demoPatients) {
            // Check if patient exists
            let patientResult = await pool.query(
                'SELECT id FROM patients WHERE phone = $1',
                [patient.phone]
            );

            let patientId;
            if (patientResult.rows.length === 0) {
                // Create patient
                const dob = new Date();
                dob.setFullYear(dob.getFullYear() - patient.age);

                patientResult = await pool.query(
                    `INSERT INTO patients (name, dob, gender, phone, address) 
                     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
                    [patient.name, dob, patient.gender, patient.phone, patient.address]
                );
                patientId = patientResult.rows[0].id;
                console.log(`  ✅ Created patient: ${patient.name}`);
            } else {
                patientId = patientResult.rows[0].id;
                console.log(`  ⏩ Patient exists: ${patient.name}`);
            }

            // Check if already admitted
            const admissionCheck = await pool.query(
                `SELECT id FROM admissions WHERE patient_id = $1 AND status = 'Admitted'`,
                [patientId]
            );

            let admissionId;
            if (admissionCheck.rows.length === 0) {
                // Create admission
                const admissionResult = await pool.query(
                    `INSERT INTO admissions (patient_id, ward, bed_number, status, admission_date) 
                     VALUES ($1, $2, $3, 'Admitted', NOW())
                     RETURNING id`,
                    [patientId, patient.ward, patient.bed]
                );
                admissionId = admissionResult.rows[0].id;
                console.log(`  🛏️ Admitted to ${patient.bed} (${patient.ward})`);
            } else {
                admissionId = admissionCheck.rows[0].id;
                console.log(`  ⏩ Already admitted: ${patient.bed}`);
            }

            // Log vitals
            await pool.query(
                `INSERT INTO vitals_logs (admission_id, patient_id, bp, temp, spo2, heart_rate, recorded_by)
                 VALUES ($1, $2, $3, $4, $5, $6, 1)`,
                [admissionId, patientId, patient.vitals.bp, patient.vitals.temp, patient.vitals.spo2, patient.vitals.heart_rate]
            );
            console.log(`  📊 Vitals logged: BP ${patient.vitals.bp}, SpO2 ${patient.vitals.spo2}%`);

            // Create care tasks
            const careTasks = [
                { type: 'Medication', description: `Administer antibiotics - ${patient.diagnosis}`, priority: 'High' },
                { type: 'Vitals', description: 'Record vital signs', priority: 'Medium' },
                { type: 'Assessment', description: 'Nursing assessment', priority: 'Medium' }
            ];

            for (const task of careTasks) {
                try {
                    await pool.query(
                        `INSERT INTO care_tasks (patient_id, type, description, priority, status, scheduled_time, created_by)
                         VALUES ($1, $2, $3, $4, 'Pending', NOW() + INTERVAL '1 hour', 1)`,
                        [patientId, task.type, task.description, task.priority]
                    );
                } catch (e) {
                    // Ignore duplicate task errors
                }
            }
            console.log(`  ✅ Care tasks created`);
            console.log('');
        }

        console.log('🎉 Demo IPD Patients seeded successfully!');
        console.log('');
        console.log('📋 Summary:');
        console.log('   - 5 patients admitted');
        console.log('   - 2 in ICU, 3 in General Ward');
        console.log('   - Vitals logged with varying NEWS2 risk levels');
        console.log('   - Care tasks created for each patient');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error seeding IPD patients:', error);
        process.exit(1);
    }
};

seedIPDPatients();
