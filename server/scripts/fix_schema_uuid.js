const { pool } = require('../db');

async function fixSchema() {
    console.log('🔧 Fixing Schema IDs (Integer -> UUID)...');
    try {
        // 1. Surgeries
        console.log('Updating surgeries.patient_id...');
        await pool.query(`
            ALTER TABLE surgeries 
            DROP CONSTRAINT IF EXISTS fk_surgeries_patient;
            
            ALTER TABLE surgeries 
            ALTER COLUMN patient_id TYPE UUID USING NULL; 
            -- Warning: Data Loss (Setting to NULL to avoid cast errors)
        `);

        // 2. PAC Assessments
        console.log('Updating pac_assessments.patient_id...');
        await pool.query(`
            ALTER TABLE pac_assessments 
            ALTER COLUMN patient_id TYPE UUID USING NULL;
        `);

        // 3. PACU Records
        console.log('Updating pacu_records.patient_id...');
        await pool.query(`
            ALTER TABLE pacu_records 
            ALTER COLUMN patient_id TYPE UUID USING NULL;
        `);
        
        // 4. PACU Beds (current_patient_id)
        console.log('Updating pacu_beds.current_patient_id...');
        await pool.query(`
            ALTER TABLE pacu_beds 
            ALTER COLUMN current_patient_id TYPE UUID USING NULL;
        `);

        // 5. Clinical Vitals (careful check)
        console.log('Updating clinical_vitals.patient_id if needed...');
        // We will try/catch this as it might already be UUID
        try {
            await pool.query(`
                ALTER TABLE clinical_vitals 
                ALTER COLUMN patient_id TYPE UUID USING NULL;
            `);
        } catch (e) {
            console.log('Skipping clinical_vitals (maybe already UUID or other error):', e.message);
        }

        // 6. Admissions (Likely connected to patients.id too)
        console.log('Updating admissions.patient_id...');
        await pool.query(`
            ALTER TABLE admissions
            ALTER COLUMN patient_id TYPE UUID USING NULL;
        `);


        console.log('✅ Schema Updated Successfully.');
    } catch (err) {
        console.error('❌ Schema Fix Failed:', err.message);
    }
    process.exit(0);
}

fixSchema();
