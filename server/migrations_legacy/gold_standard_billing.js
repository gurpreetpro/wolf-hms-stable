/**
 * Migration: Add Gold Standard OPD Billing Columns
 * Adds visit tracking and consultation fee columns
 */
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'hms_db',
    password: process.env.DB_PASSWORD || 'Hospital456!',
    port: process.env.DB_PORT || 5432,
});

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('🚀 Starting Gold Standard OPD Billing Migration...\n');

        // 1. Add visit_count to patients
        console.log('1️⃣ Adding visit_count to patients...');
        await client.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS visit_count INTEGER DEFAULT 0
        `);
        console.log('   ✅ visit_count added');

        // 2. Add last_visit_date to patients
        console.log('2️⃣ Adding last_visit_date to patients...');
        await client.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS last_visit_date DATE
        `);
        console.log('   ✅ last_visit_date added');

        // 3. Add is_registered to patients (tracks if registration fee was ever paid)
        console.log('3️⃣ Adding is_registered to patients...');
        await client.query(`
            ALTER TABLE patients 
            ADD COLUMN IF NOT EXISTS is_registered BOOLEAN DEFAULT false
        `);
        console.log('   ✅ is_registered added');

        // 4. Add consultation_fee to users (doctors)
        console.log('4️⃣ Adding consultation_fee to users...');
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS consultation_fee DECIMAL(10,2) DEFAULT 500.00
        `);
        console.log('   ✅ consultation_fee added');

        // 5. Backfill visit_count from existing opd_visits
        console.log('5️⃣ Backfilling visit_count from existing visits...');
        await client.query(`
            UPDATE patients p
            SET visit_count = (
                SELECT COUNT(*) FROM opd_visits v WHERE v.patient_id = p.id
            )
        `);
        console.log('   ✅ visit_count backfilled');

        // 6. Backfill last_visit_date from existing opd_visits
        console.log('6️⃣ Backfilling last_visit_date...');
        await client.query(`
            UPDATE patients p
            SET last_visit_date = (
                SELECT MAX(visit_date) FROM opd_visits v WHERE v.patient_id = p.id
            )
        `);
        console.log('   ✅ last_visit_date backfilled');

        // 7. Mark patients with visits as registered
        console.log('7️⃣ Marking existing patients as registered...');
        await client.query(`
            UPDATE patients 
            SET is_registered = true 
            WHERE visit_count > 0
        `);
        console.log('   ✅ is_registered backfilled');

        console.log('\n✅ Migration Complete!');
        console.log('📊 Summary:');
        
        const stats = await client.query(`
            SELECT 
                COUNT(*) as total_patients,
                SUM(CASE WHEN is_registered THEN 1 ELSE 0 END) as registered_patients,
                AVG(visit_count)::NUMERIC(10,1) as avg_visits
            FROM patients
        `);
        console.log(`   - Total Patients: ${stats.rows[0].total_patients}`);
        console.log(`   - Registered: ${stats.rows[0].registered_patients}`);
        console.log(`   - Avg Visits: ${stats.rows[0].avg_visits || 0}`);

    } catch (error) {
        console.error('❌ Migration Error:', error.message);
        throw error;
    } finally {
        client.release();
        await pool.end();
    }
}

migrate().then(() => process.exit(0)).catch(() => process.exit(1));
