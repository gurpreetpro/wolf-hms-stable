const { Pool } = require('pg');
require('dotenv').config({ path: './server/.env' });

const dbConfig = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: parseInt(process.env.DB_PORT || '5432'),
};

async function patch() {
    const pool = new Pool(dbConfig);
    try {
        console.log('🧹 Truncating blood bank tables cascade...');
        await pool.query('TRUNCATE TABLE blood_transfusions, blood_cross_matches, blood_requests CASCADE;');

        console.log('🔧 Altering blood bank columns to UUID...');
        
        // 1. blood_requests
        await pool.query('ALTER TABLE blood_requests DROP COLUMN IF EXISTS patient_id;');
        await pool.query('ALTER TABLE blood_requests ADD COLUMN patient_id UUID NOT NULL;');
        console.log('   - blood_requests.patient_id updated to UUID');
        
        // 2. blood_cross_matches
        await pool.query('ALTER TABLE blood_cross_matches DROP COLUMN IF EXISTS patient_id;');
        await pool.query('ALTER TABLE blood_cross_matches ADD COLUMN patient_id UUID NOT NULL;');
        console.log('   - blood_cross_matches.patient_id updated to UUID');
        
        // 3. blood_transfusions
        await pool.query('ALTER TABLE blood_transfusions DROP COLUMN IF EXISTS patient_id;');
        await pool.query('ALTER TABLE blood_transfusions ADD COLUMN patient_id UUID NOT NULL;');
        console.log('   - blood_transfusions.patient_id updated to UUID');
        
        // 4. blood_units
        await pool.query('ALTER TABLE blood_units DROP COLUMN IF EXISTS reserved_for_patient;');
        await pool.query('ALTER TABLE blood_units ADD COLUMN reserved_for_patient UUID;');
        await pool.query('ALTER TABLE blood_units DROP COLUMN IF EXISTS issued_to_patient;');
        await pool.query('ALTER TABLE blood_units ADD COLUMN issued_to_patient UUID;');
        console.log('   - blood_units reserved/issued fields updated to UUID');
        
        // 5. transfusion_reactions (if table exists)
        try {
            await pool.query('ALTER TABLE transfusion_reactions DROP COLUMN IF EXISTS patient_id;');
            await pool.query('ALTER TABLE transfusion_reactions ADD COLUMN patient_id UUID NOT NULL;');
            console.log('   - transfusion_reactions.patient_id updated to UUID');
        } catch (err) {
            console.log('   - (Optional) transfusion_reactions table not found or skipped.');
        }
        
        console.log('✅ DATABASE SCHEMA REPAIRED AND READY FOR SIMULATION!');
    } catch (e) {
        console.error('💥 Patching failed:', e.message);
    } finally {
        await pool.end();
    }
}

patch();
