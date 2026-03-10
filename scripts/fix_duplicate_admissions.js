const { Pool } = require('pg');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../server/.env') });

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function fixDuplicates() {
    try {
        console.log('🔧 Starting Self-Healing for Duplicate Admissions...');

        // 1. Find Patients with > 1 Active Admission
        const res = await pool.query(`
            SELECT patient_id, count(*) 
            FROM admissions 
            WHERE status = 'Admitted' 
            GROUP BY patient_id 
            HAVING count(*) > 1
        `);

        if (res.rows.length === 0) {
            console.log('✅ No duplicate admissions found.');
            return;
        }

        console.log(`found ${res.rows.length} patients with duplicate admissions.`);

        // 2. Fix each patient
        for (const row of res.rows) {
            const pid = row.patient_id;
            
            // Get all admissions for this patient, ordered by date DESC (Latest first)
            const adms = await pool.query(
                "SELECT id, admission_date, ward, bed_number FROM admissions WHERE patient_id = $1 AND status = 'Admitted' ORDER BY admission_date DESC",
                [pid]
            );

            const [latest, ...duplicates] = adms.rows;
            console.log(`Patient ${pid}: Keeping Admission ${latest.id} (${latest.ward}/${latest.bed_number}). Fixing ${duplicates.length} duplicates...`);

            // Mark duplicates as 'Data Error' (or Discharged)
            for (const dup of duplicates) {
                await pool.query(
                    "UPDATE admissions SET status = 'Data Error', discharge_reason = 'Duplicate Entry Cleanup' WHERE id = $1",
                    [dup.id]
                );
                
                // Also free up the bed if it's different
                // But wait, getBeds uses the bed status.
                // We should ensure the bed for the DUPLICATE is marked Available.
                // But only if it's NOT the same bed as the valid one?
                if (dup.bed_number !== latest.bed_number) {
                     await pool.query(
                        "UPDATE beds SET status = 'Available' WHERE bed_number = $1 AND ward_id = (SELECT id FROM wards WHERE name ILIKE $2 LIMIT 1)",
                        [dup.bed_number, dup.ward.trim()]
                    );
                }
            }
        }
        console.log('✅ Fix Complete.');

    } catch (err) {
        console.error('❌ Error:', err);
    } finally {
        await pool.end();
    }
}

fixDuplicates();
