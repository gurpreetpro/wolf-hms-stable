// Add patient_number column with auto-generation
const pool = require('./config/db');

async function addPatientNumber() {
    try {
        console.log('Adding patient_number to patients table...\n');

        // Add patient_number column if not exists
        await pool.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS patient_number VARCHAR(20) UNIQUE
        `);
        console.log('✓ Added patient_number column');

        // Create index for fast lookups
        await pool.query(`
            CREATE INDEX IF NOT EXISTS idx_patients_number ON patients(patient_number)
        `);
        console.log('✓ Created index for patient_number');

        // Get all patients ordered by creation date
        const patients = await pool.query(`
            SELECT id, created_at FROM patients 
            WHERE patient_number IS NULL
            ORDER BY created_at
        `);

        let counter = 1;
        for (const patient of patients.rows) {
            const year = new Date(patient.created_at || new Date()).getFullYear();
            const patNum = `PT-${year}-${String(counter).padStart(4, '0')}`;

            await pool.query(
                'UPDATE patients SET patient_number = $1 WHERE id = $2',
                [patNum, patient.id]
            );
            console.log(`  Patient ${patient.id.slice(0, 8)}... → ${patNum}`);
            counter++;
        }

        console.log('\n=====================================');
        console.log('✅ Patient numbers added successfully!');
        console.log('=====================================');
        console.log('Format: PT-YYYY-XXXX');
        console.log('Example: PT-2024-0001');
        console.log(`Total patients updated: ${patients.rows.length}`);
        console.log('=====================================');

        process.exit(0);
    } catch (err) {
        console.error('Migration error:', err);
        process.exit(1);
    }
}

addPatientNumber();
